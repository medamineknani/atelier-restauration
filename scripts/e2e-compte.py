#!/usr/bin/env python3
"""
Parcours de l'espace client, exécuté contre un serveur de développement.

    npm run dev
    python3 scripts/e2e-compte.py [http://localhost:3000]

Le script rejoue d'abord le tunnel de commande (scripts/e2e-checkout.py) pour
obtenir une commande **passée en invité**, puis vérifie que la première
connexion la rattache bien au compte. C'est le point le plus fragile de
l'espace client : un client qui commande sans compte puis se connecte avec la
même adresse doit retrouver ses photos.

Il nécessite `NODE_ENV != production` (lien de connexion renvoyé dans la
réponse, route `/api/dev/draft`).
"""

from __future__ import annotations

import html
import json
import os
import re
import subprocess
import sys
import urllib.parse
import zipfile

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000").rstrip("/")
HERE = os.path.dirname(os.path.abspath(__file__))
JAR = "/tmp/atelier-e2e-compte-cookies.txt"

GUEST_EMAIL = "amel@example.tn"
FRESH_EMAIL = "nadia@example.tn"

failures: list[str] = []


def curl(jar: str, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["curl", "-s", "-b", jar, "-c", jar, *args],
                          capture_output=True, text=True)


def get(path: str, jar: str = JAR) -> str:
    out = f"/tmp/atelier-compte{path.replace('/', '_')}.html"
    code = curl(jar, "-o", out, "-w", "%{http_code}", f"{BASE}{path}").stdout.strip()
    if code != "200":
        failures.append(f"GET {path} → {code} (200 attendu)")
        return ""
    return open(out, encoding="utf-8").read()


def status_of(path: str, jar: str = JAR) -> str:
    return curl(jar, "-o", "/dev/null", "-w", "%{http_code} %{redirect_url}",
                f"{BASE}{path}").stdout.strip()


def check(label: str, ok: bool, detail: str = "") -> None:
    print(("  ✓ " if ok else "  ✗ ") + label + (f" — {detail}" if detail else ""))
    if not ok:
        failures.append(label)


def action_fields(page: str, marker: str) -> dict[str, str]:
    """Champs cachés que Next ajoute au formulaire contenant `marker`."""
    fields: dict[str, str] = {}
    for form in re.findall(r"<form[^>]*>.*?</form>", page, re.S):
        if marker not in form:
            continue
        for tag in re.findall(r"<input[^>]*>", form):
            name = re.search(r'name="(\$ACTION[^"]*)"', tag)
            if not name:
                continue
            value = re.search(r'value="([^"]*)"', tag)
            fields[name.group(1)] = html.unescape(value.group(1)) if value else ""
        break
    return fields


last_status = ""


def post_form(path: str, page: str, data: dict[str, str], marker: str, jar: str = JAR) -> str:
    """
    Rejoue un formulaire d'action serveur ; renvoie le corps de la réponse.

    Le statut et l'éventuelle redirection sont rangés dans `last_status` :
    une action qui ne renvoie rien d'exploitable dans le corps (cas des
    redirections) se vérifie là.
    """
    global last_status
    args = ["-o", "/tmp/atelier-compte-post.txt", "-D", "/tmp/atelier-compte-post.h",
            "-w", "%{http_code} %{redirect_url}", "-X", "POST", "-H", f"Origin: {BASE}"]
    for key, value in action_fields(page, marker).items():
        args += ["-F", f"{key}={value}"]
    for key, value in data.items():
        args += ["-F", f"{key}={value}"]
    last_status = curl(jar, *args, f"{BASE}{path}").stdout.strip()
    body = open("/tmp/atelier-compte-post.txt", encoding="utf-8", errors="replace").read()
    headers = open("/tmp/atelier-compte-post.h", encoding="utf-8", errors="replace").read()
    return body + headers


def main() -> int:
    print(f"Espace client — {BASE}\n")

    for jar in (JAR, "/tmp/atelier-e2e-compte-vide.txt"):
        if os.path.exists(jar):
            os.remove(jar)

    # --- Commande en invité ------------------------------------------------
    print("0. Commande passée en invité")
    checkout = subprocess.run([sys.executable, os.path.join(HERE, "e2e-checkout.py"), BASE],
                              capture_output=True, text=True)
    check("tunnel de commande", checkout.returncode == 0,
          (checkout.stdout.strip().splitlines() or [""])[-1])

    reference = ""
    for line in checkout.stdout.splitlines():
        match = re.search(r"brouillon créé.*—\s*(AR-[0-9-]+)", line)
        if match:
            reference = match.group(1)
    check("référence récupérée", bool(reference), reference)
    if not reference:
        return 1

    # --- Connexion ---------------------------------------------------------
    print("1. Demande de lien")
    page = get("/connexion")
    check("page de connexion", "lien de connexion" in page.lower() or "email" in page.lower())
    check("formulaire progressif", "$ACTION" in page)

    body = post_form("/connexion", page, {"locale": "fr", "email": GUEST_EMAIL},
                     'name="email"')
    link = re.search(r"/connexion/lien\?t=([A-Za-z0-9_-]+)", body)
    check("lien de connexion délivré", bool(link), link.group(1)[:12] + "…" if link else body[:120])
    if not link:
        return 1
    token = link.group(1)

    print("2. Ouverture du lien")
    status = status_of(f"/connexion/lien?t={token}")
    check("session ouverte", status.startswith(("303", "307", "302")), status)

    # --- Rattachement de la commande invitée -------------------------------
    print("3. Rattachement de la commande invitée")
    page = get("/compte")
    check("tableau de bord", reference in page)
    check("statut affiché", "En attente de paiement" in page)

    page = get("/compte/commandes")
    check("liste des commandes", reference in page)

    page = get(f"/compte/commandes/{reference}")
    check("détail de commande", reference in page and "Votre commande" in page)
    check("récapitulatif chiffré", "Total" in page and "DT" in page)
    check("photos confiées visibles", "/api/files/" in page)

    # --- Facture & résultats ----------------------------------------------
    print("4. Documents")
    code = status_of(f"/api/compte/commandes/{reference}/facture").split()[0]
    check("facture refusée avant paiement", code == "409", code)

    code = status_of(f"/api/compte/commandes/{reference}/resultats").split()[0]
    check("résultats absents", code == "404", code)

    # --- Préférences -------------------------------------------------------
    print("5. Paramètres")
    page = get("/compte/parametres")
    check("page de paramètres", GUEST_EMAIL in page and "SUPPRIMER" in page)

    # --- Sécurité ----------------------------------------------------------
    print("6. Sécurité")
    empty = "/tmp/atelier-e2e-compte-vide.txt"
    code = status_of("/compte", empty)
    check("espace protégé sans session", code.startswith(("303", "307", "302")), code)

    code = status_of(f"/api/compte/commandes/{reference}/facture", empty).split()[0]
    check("facture protégée", code in {"401", "404"}, code)

    # Un autre compte ne doit pas voir la commande de Amel.
    other = "/tmp/atelier-e2e-compte-autre.txt"
    if os.path.exists(other):
        os.remove(other)
    page2 = get("/connexion", other)
    body = post_form("/connexion", page2, {"locale": "fr", "email": FRESH_EMAIL},
                     'name="email"', other)
    link2 = re.search(r"/connexion/lien\?t=([A-Za-z0-9_-]+)", body)
    check("second compte créé", bool(link2))
    if link2:
        status_of(f"/connexion/lien?t={link2.group(1)}", other)
        code = status_of(f"/compte/commandes/{reference}", other).split()[0]
        check("commande d'autrui invisible", code == "404", code)

        code = status_of("/compte", other).split()[0]
        check("nouveau compte vide", code == "200", code)

    # --- Commande avancée : facture & résultats ----------------------------
    print("7. Commande payée et restaurée")
    result = curl(JAR, "-X", "POST", "-H", "content-type: application/json",
                  "-d", json.dumps({"reference": reference, "status": "received",
                                    "restored": True}),
                  f"{BASE}/api/dev/order")
    payload = json.loads(result.stdout or "{}")
    check("statut avancé", payload.get("status") == "received", str(payload))
    check("fichiers restaurés déposés", payload.get("restored", 0) >= 1, str(payload.get("restored")))

    page = get(f"/compte/commandes/{reference}")
    check("résultats visibles", "restauree-" in page)

    result = curl(JAR, "-o", "/tmp/atelier-compte-resultats.zip", "-w", "%{http_code} %{content_type}",
                  f"{BASE}/api/compte/commandes/{reference}/resultats")
    check("archive téléchargée", result.stdout.startswith("200 application/zip"),
          result.stdout.strip())

    try:
        archive = zipfile.ZipFile("/tmp/atelier-compte-resultats.zip")
        names = archive.namelist()
        check("archive valide", archive.testzip() is None and len(names) >= 1,
              ", ".join(names[:3]))
    except Exception as error:  # noqa: BLE001 — le diagnostic prime ici
        check("archive valide", False, str(error))

    result = curl(JAR, "-o", "/tmp/atelier-compte-facture.html", "-w", "%{http_code}",
                  f"{BASE}/api/compte/commandes/{reference}/facture")
    check("facture éditée", result.stdout.strip() == "200", result.stdout.strip())

    invoice_html = open("/tmp/atelier-compte-facture.html", encoding="utf-8",
                        errors="replace").read()
    check("facture complète",
          all(text in invoice_html for text in ["FACTURE", reference, "Amel Ben Salah"]))
    number = re.search(r"F-\d{4}-\d{4}", invoice_html)
    check("numéro de facture", bool(number), number.group(0) if number else "")

    # --- Suppression du compte (RGPD) --------------------------------------
    print("8. Suppression du compte")
    settings = get("/compte/parametres", other)
    post_form("/compte/parametres", settings,
              {"locale": "fr", "confirmation": "PAS-BON"}, 'name="confirmation"', other)
    check("suppression refusée sans confirmation exacte",
          "erreur=confirmation" in last_status, last_status[:80])

    code = status_of("/compte", other).split()[0]
    check("compte toujours vivant", code == "200", code)

    settings = get("/compte/parametres", other)
    post_form("/compte/parametres", settings,
              {"locale": "fr", "confirmation": "SUPPRIMER"}, 'name="confirmation"', other)
    code = status_of("/compte", other).split()[0]
    check("session fermée après suppression", code in {"303", "307", "302"}, code)

    print()
    if failures:
        print(f"{len(failures)} échec(s) :")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print("Espace client : OK")
    print(f"  Commande rattachée : {reference} ({GUEST_EMAIL})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
