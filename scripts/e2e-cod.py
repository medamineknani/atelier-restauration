#!/usr/bin/env python3
"""
Paiement à la livraison (contre-remboursement), exécuté contre un serveur de
développement.

    npm run dev
    python3 scripts/e2e-cod.py [http://localhost:3000]

Le contre-remboursement n'est pas une variante du virement : c'est le seul
moyen de règlement où l'atelier **avance le travail avant d'être payé**. Ce
script vérifie les trois conséquences de ce fait :

  1. il n'est proposé que là où un colis sera réellement livré ;
  2. la commande démarre aussitôt, sans attendre un règlement qui viendra
     avec le colis ;
  3. l'encaissement est constaté par l'atelier, et c'est lui — et non la
     commande — qui fixe la date de paiement.

Il nécessite `NODE_ENV != production` (routes `/api/dev/*`).
"""

from __future__ import annotations

import html
import json
import os
import re
import subprocess
import sys
import urllib.parse

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000").rstrip("/")

ADMIN_JAR = "/tmp/atelier-e2e-cod-admin.txt"
CLIENT_JAR = "/tmp/atelier-e2e-cod-client.txt"

ADMIN_EMAIL = os.environ.get("SEED_ADMIN_EMAIL", "admin@atelier-restauration.tn")
ADMIN_PASSWORD = os.environ.get("SEED_ADMIN_PASSWORD", "changeme-please")

failures: list[str] = []
last_status = ""


def curl(jar: str, *args: str):
    return subprocess.run(["curl", "-s", "-b", jar, "-c", jar, *args],
                          capture_output=True, text=True)


def get(path: str, jar: str = CLIENT_JAR) -> str:
    # Sans `-c` : réécrire le fichier de cookies à partir d'une réponse qui
    # n'en pose aucun viderait la session. Seules les étapes d'authentification
    # ont le droit de la mettre à jour.
    out = "/tmp/atelier-cod-page.html"
    cmd = subprocess.run(["curl", "-s", "-b", jar, "-o", out, "-w", "%{http_code}",
                          f"{BASE}{path}"], capture_output=True, text=True)
    code = cmd.stdout.strip()
    if code != "200":
        failures.append(f"GET {path} → {code} (200 attendu)")
        return ""
    return open(out, encoding="utf-8", errors="replace").read()


def status_of(path: str, jar: str = CLIENT_JAR) -> str:
    return curl(jar, "-o", "/dev/null", "-w", "%{http_code}",
                f"{BASE}{path}").stdout.strip()


def text(page: str) -> str:
    stripped = re.sub(r"<script.*?</script>", " ", page, flags=re.S)
    stripped = re.sub(r"<[^>]+>", " ", stripped)
    return re.sub(r"\s+", " ", stripped).replace(" ", " ").replace("\xa0", " ")


def check(label: str, ok: bool, detail: str = "") -> None:
    print(("  ✓ " if ok else "  ✗ ") + label + (f" — {detail}" if detail else ""))
    if not ok:
        failures.append(label)


def post_form(path: str, page: str, data: dict[str, str], marker: str,
              jar: str = CLIENT_JAR) -> str:
    global last_status
    args = ["-o", "/tmp/atelier-cod-post.html", "-w", "%{http_code} %{redirect_url}",
            "-X", "POST", "-H", f"Origin: {BASE}"]
    forms = [f for f in re.findall(r"<form[^>]*>.*?</form>", page, re.S) if marker in f]
    if not forms:
        last_status = "aucun formulaire"
        return last_status
    for tag in re.findall(r"<input[^>]*>", forms[0]):
        name = re.search(r'name="(\$ACTION[^"]*)"', tag)
        if not name:
            continue
        value = re.search(r'value="([^"]*)"', tag)
        args += ["-F", f"{name.group(1)}={html.unescape(value.group(1)) if value else ''}"]
    for key, value in data.items():
        args += ["-F", f"{key}={value}"]
    last_status = curl(jar, *args, f"{BASE}{path}").stdout.strip()
    return last_status


def new_draft(kind: str) -> dict:
    curl(CLIENT_JAR, "-X", "DELETE", f"{BASE}/api/dev/draft")
    result = curl(CLIENT_JAR, "-X", "POST", "-H", "content-type: application/json",
                  "-d", '{"kind":"%s"}' % kind, f"{BASE}/api/dev/draft")
    return json.loads(result.stdout)


def fill_tunnel(pack_index: int, photo: str = "assets/sources/famille-1954.jpg") -> None:
    """Remplit les étapes jusqu'au récapitulatif. Le moyen de règlement, lui,
    est choisi par l'appelant."""
    page = get("/commande/pack")
    slugs = re.findall(r'name="pack" value="([^"]+)"', page)
    if not slugs:
        failures.append("aucun pack proposé")
        return
    post_form("/commande/pack", page, {"locale": "fr", "pack": slugs[pack_index]},
              'name="pack"')

    page = get("/commande/extras")
    extras = re.findall(r'name="extra:([0-9a-f-]+)"', page)
    data = {"locale": "fr"}
    for extra in extras:
        data[f"extra:{extra}"] = "0"
    post_form("/commande/extras", page, data, 'name="locale"')

    get("/commande/photos")
    curl(CLIENT_JAR, "-F", f"file=@{photo};type=image/jpeg", f"{BASE}/api/uploads/local")

    page = get("/commande/coordonnees")
    post_form("/commande/coordonnees", page, {
        "locale": "fr",
        "firstName": "Amel",
        "lastName": "Ben Salah",
        "email": "amel@example.tn",
        "phone": "+216 20 000 000",
        "line1": "12, rue de la Photographie",
        "city": "Tunis",
        "governorate": "Tunis",
        "postalCode": "1000",
        "country": "TN",
        "notes": "",
    }, 'name="firstName"')


def get_raw(path: str, jar: str = CLIENT_JAR) -> tuple[str, str]:
    out = "/tmp/atelier-cod-page.html"
    cmd = subprocess.run(["curl", "-s", "-b", jar, "-o", out, "-w", "%{http_code}",
                          f"{BASE}{path}"], capture_output=True, text=True)
    return cmd.stdout.strip(), open(out, encoding="utf-8", errors="replace").read()


def last_body() -> str:
    try:
        return open("/tmp/atelier-cod-post.html", encoding="utf-8", errors="replace").read()
    except OSError:
        return ""


def client_login(email: str) -> bool:
    """Lien magique : en développement, le jeton est rendu dans la réponse."""
    page = get("/connexion", CLIENT_JAR)
    post_form("/connexion", page, {"locale": "fr", "email": email}, 'name="email"',
              CLIENT_JAR)
    link = re.search(r"/connexion/lien\?t=([A-Za-z0-9_-]+)", last_body())
    if not link:
        return False
    return status_of(f"/connexion/lien?t={link.group(1)}", CLIENT_JAR).startswith("30")


def providers_on(page: str) -> list[str]:
    return re.findall(r'name="provider" value="([^"]+)"', page)


def submit_with(provider: str) -> str:
    page = get("/commande/recapitulatif")
    return post_form("/commande/recapitulatif", page,
                     {"locale": "fr", "provider": provider}, 'name="provider"')


def main() -> int:
    print(f"Paiement à la livraison — {BASE}\n")

    for jar in (ADMIN_JAR, CLIENT_JAR):
        if os.path.exists(jar):
            os.remove(jar)

    # --- Commande livrée : le contre-remboursement doit être proposé -------
    print("1. Commande livrée")
    draft = new_draft("photobook")
    reference = draft.get("reference", "")
    check("brouillon photobook créé", bool(draft.get("orderId")), reference)

    fill_tunnel(0)
    page = get("/commande/recapitulatif")
    offered = providers_on(page)
    check("paiement à la livraison proposé", "cod" in offered, ", ".join(offered))
    check("option décrite au client", "Paiement à la livraison" in text(page))

    status = submit_with("cod")
    check("commande soumise", status.startswith("303"), status[:70])

    url = status.split(" ", 1)[1] if " " in status else ""
    token = urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get("t", [""])[0]
    check("jeton invité délivré", bool(token))

    # Le cœur du sujet : rien n'est à attendre, le travail démarre.
    follow = text(get(f"/commande/suivi/{reference}?t={token}"))
    check("suivi accessible", reference in follow, follow[:80])
    check("commande prise en charge sans attendre",
          "En attente de paiement" not in follow, follow[:120])

    confirmation = text(get(f"/commande/confirmation/{reference}?t={token}"))
    check("montant à préparer affiché", "préparer" in confirmation)

    # --- Commande numérique : pas de colis, pas de contre-remboursement ----
    print("2. Commande sans colis")
    new_draft("digital")
    fill_tunnel(1)
    page = get("/commande/recapitulatif")
    offered = providers_on(page)
    check("paiement à la livraison retiré", "cod" not in offered, ", ".join(offered))
    check("raison expliquée au client",
          "téléchargement" in text(page) or "sans colis" in text(page))

    # Même en forçant le champ, le serveur doit refuser.
    status = submit_with("cod")
    check("contournement refusé", "reglement=cod_unavailable" in status, status[:90])

    # --- Encaissement par l'atelier ----------------------------------------
    print("3. Encaissement")
    page = get("/admin/connexion", ADMIN_JAR)
    post_form("/admin/connexion", page,
              {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "next": "/admin"},
              'name="password"', ADMIN_JAR)
    check("session administrateur ouverte", "303" in last_status, last_status[:60])

    page = get(f"/admin/commandes?q={reference}", ADMIN_JAR)
    order_id = ""
    match = re.search(r"/admin/commandes/([0-9a-f-]{36})", page)
    if match:
        order_id = match.group(1)
    check("commande retrouvée", bool(order_id), order_id[:8] + "…" if order_id else "")
    if not order_id:
        return 1

    page = get(f"/admin/commandes/{order_id}?onglet=facture", ADMIN_JAR)
    visible = text(page)
    check("moyen de règlement identifié", "Paiement à la livraison" in visible)
    check("à encaisser signalé", "À encaisser à la livraison" in visible)

    # La facture est un document client : on la lit avec une session client.
    check("session client ouverte", client_login("amel@example.tn"))
    invoice = text(get(f"/api/compte/commandes/{reference}/facture", CLIENT_JAR))
    check("facture éditée dès la prise en charge", reference in invoice, invoice[:100])
    check("facture mentionne le règlement à la livraison",
          "À régler à la livraison" in invoice, invoice[:120])

    post_form("/admin/commandes/{0}".format(order_id), page, {"orderId": order_id},
              "Encaissé à la livraison", ADMIN_JAR)
    check("encaissement constaté", "ok=encaisse" in last_status, last_status[:80])

    page = get(f"/admin/commandes/{order_id}?onglet=facture", ADMIN_JAR)
    check("paiement marqué encaissé", "encaissé" in text(page))

    code, raw = get_raw(f"/api/compte/commandes/{reference}/facture", CLIENT_JAR)
    invoice = text(raw)
    # Contrôle explicite du code : une lecture vide ferait passer le test
    # suivant sans rien vérifier du tout.
    check("facture relue après encaissement", code == "200", code)
    check("facture n'annonce plus de règlement à venir",
          "À régler à la livraison" not in invoice)

    # --- Plafond -----------------------------------------------------------
    print("4. Plafond")
    page = get("/admin/parametres?section=paiement", ADMIN_JAR)
    post_form("/admin/parametres?section=paiement", page, {
        "manualHolder": "Atelier Restauration",
        "manualBank": "Banque de test",
        "manualIban": "TN59 0000 0000 0000 0000 0000",
        "providerOrder": "manual, cod",
        "codEnabled": "on",
        "codMax": "1.000",
    }, 'name="manualIban"', ADMIN_JAR)
    check("plafond enregistré", "303" in last_status, last_status[:70])

    new_draft("photobook")
    fill_tunnel(0)
    page = get("/commande/recapitulatif")
    check("contre-remboursement retiré au-delà du plafond",
          "cod" not in providers_on(page), ", ".join(providers_on(page)))

    page = get("/admin/parametres?section=paiement", ADMIN_JAR)
    post_form("/admin/parametres?section=paiement", page, {
        "manualHolder": "Atelier Restauration",
        "manualBank": "Banque de test",
        "manualIban": "TN59 0000 0000 0000 0000 0000",
        "providerOrder": "manual, cod",
        "codEnabled": "on",
        "codMax": "",
    }, 'name="manualIban"', ADMIN_JAR)
    check("plafond retiré", "303" in last_status, last_status[:70])

    print()
    if failures:
        print(f"{len(failures)} échec(s) :")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print("Paiement à la livraison : OK")
    print(f"  Commande contrôlée : {reference} — démarrée sans attendre, encaissée à la livraison")
    return 0


if __name__ == "__main__":
    sys.exit(main())
