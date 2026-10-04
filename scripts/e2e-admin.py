#!/usr/bin/env python3
"""
Parcours du back-office, exécuté contre un serveur de développement.

    npm run dev
    python3 scripts/e2e-admin.py [http://localhost:3000]

Le script crée d'abord une commande en invité (e2e-checkout.py), puis joue
l'atelier : connexion administrateur, changement de statut, dépôt des
photographies restaurées, publication, facture. Il vérifie enfin que le
back-office est fermé à un simple client — c'est la frontière la plus
sensible du projet.

Il nécessite `NODE_ENV != production` (routes `/api/dev/*`).
"""

from __future__ import annotations

import html
import json
import os
import re
import subprocess
import sys
import zipfile

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000").rstrip("/")
HERE = os.path.dirname(os.path.abspath(__file__))

ADMIN_JAR = "/tmp/atelier-e2e-admin-cookies.txt"
CLIENT_JAR = "/tmp/atelier-e2e-admin-client.txt"
EMPTY_JAR = "/tmp/atelier-e2e-admin-vide.txt"

ADMIN_EMAIL = os.environ.get("SEED_ADMIN_EMAIL", "admin@atelier-restauration.tn")
ADMIN_PASSWORD = os.environ.get("SEED_ADMIN_PASSWORD", "changeme-please")

failures: list[str] = []
last_status = ""


def curl(jar: str, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["curl", "-s", "-b", jar, "-c", jar, *args],
                          capture_output=True, text=True)


def get(path: str, jar: str = ADMIN_JAR) -> str:
    out = "/tmp/atelier-admin-page.html"
    code = curl(jar, "-o", out, "-w", "%{http_code}", f"{BASE}{path}").stdout.strip()
    if code != "200":
        failures.append(f"GET {path} → {code} (200 attendu)")
        return ""
    return open(out, encoding="utf-8", errors="replace").read()


def status_of(path: str, jar: str = ADMIN_JAR) -> str:
    return curl(jar, "-o", "/dev/null", "-w", "%{http_code} %{redirect_url}",
                f"{BASE}{path}").stdout.strip()


def check(label: str, ok: bool, detail: str = "") -> None:
    print(("  ✓ " if ok else "  ✗ ") + label + (f" — {detail}" if detail else ""))
    if not ok:
        failures.append(label)


def action_fields(page: str, marker: str) -> dict[str, str]:
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


def post_form(path: str, page: str, data: dict[str, str], marker: str,
              jar: str = ADMIN_JAR) -> str:
    global last_status
    args = ["-o", "/tmp/atelier-admin-post.txt", "-D", "/tmp/atelier-admin-post.h",
            "-w", "%{http_code} %{redirect_url}", "-X", "POST", "-H", f"Origin: {BASE}"]
    for key, value in action_fields(page, marker).items():
        args += ["-F", f"{key}={value}"]
    for key, value in data.items():
        args += ["-F", f"{key}={value}"]
    last_status = curl(jar, *args, f"{BASE}{path}").stdout.strip()
    body = open("/tmp/atelier-admin-post.txt", encoding="utf-8", errors="replace").read()
    headers = open("/tmp/atelier-admin-post.h", encoding="utf-8", errors="replace").read()
    return body + headers


def main() -> int:
    print(f"Back-office — {BASE}\n")

    for jar in (ADMIN_JAR, CLIENT_JAR, EMPTY_JAR):
        if os.path.exists(jar):
            os.remove(jar)

    # --- Commande en invité ------------------------------------------------
    print("0. Commande à traiter")
    checkout = subprocess.run([sys.executable, os.path.join(HERE, "e2e-checkout.py"), BASE],
                              capture_output=True, text=True)
    check("tunnel de commande", checkout.returncode == 0)

    reference = ""
    for line in checkout.stdout.splitlines():
        match = re.search(r"brouillon créé.*—\s*(AR-[0-9-]+)", line)
        if match:
            reference = match.group(1)
    check("référence récupérée", bool(reference), reference)
    if not reference:
        return 1

    # --- Garde d'accès -----------------------------------------------------
    print("1. Accès")
    code = status_of("/admin", EMPTY_JAR)
    check("back-office fermé sans session", code.startswith(("303", "307", "302")), code)

    code = curl(EMPTY_JAR, "-o", "/dev/null", "-w", "%{http_code}", "-X", "POST",
                "-H", f"Origin: {BASE}",
                f"{BASE}/api/admin/commandes/x/resultats").stdout.strip()
    check("dépôt de résultats protégé", code == "401", code)

    # --- Connexion administrateur ------------------------------------------
    print("2. Connexion")
    page = get("/admin/connexion", ADMIN_JAR)
    check("formulaire de connexion", "$ACTION" in page)

    post_form("/admin/connexion", page,
              {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "next": "/admin"},
              'name="password"', ADMIN_JAR)
    check("session ouverte", "303" in last_status or "307" in last_status, last_status[:80])

    page = get("/admin")
    check("tableau de bord", "Tableau de bord" in page or "file de production" in page)
    check("file de production", reference in page)

    # --- Écran de commande -------------------------------------------------
    print("3. Commande")
    page = get(f"/admin/commandes?q={reference}")
    order_id = ""
    match = re.search(rf'/admin/commandes/([0-9a-f-]{{36}})"[^>]*>\s*<[^>]*>\s*{reference}', page)
    if not match:
        match = re.search(r"/admin/commandes/([0-9a-f-]{36})", page)
    if match:
        order_id = match.group(1)
    check("commande listée", bool(order_id), order_id[:8] + "…" if order_id else page[:120])
    if not order_id:
        return 1

    for onglet in ("photos", "resultats", "client", "notes", "facture", "journal"):
        code = status_of(f"/admin/commandes/{order_id}?onglet={onglet}").split()[0]
        check(f"onglet {onglet}", code == "200", code)

    page = get(f"/admin/commandes/{order_id}?onglet=photos")
    check("photos reçues", "/api/files/" in page)

    # --- Changement de statut ----------------------------------------------
    print("4. Traitement")
    page = get(f"/admin/commandes/{order_id}")
    post_form(f"/admin/commandes/{order_id}", page,
              {"orderId": order_id, "status": "received",
               "message": "Bonjour, paiement reçu, le travail commence.",
               "notify": "on"},
              'name="status"', ADMIN_JAR)
    check("statut changé", "ok=statut" in last_status, last_status[:80])

    page = get(f"/admin/commandes/{order_id}?onglet=facture")
    check("facture éditée au paiement", "F-" in page, "")

    # --- Dépôt des résultats -----------------------------------------------
    print("5. Résultats")
    photo = "assets/sources/famille-1954.jpg"
    result = curl(ADMIN_JAR, "-F", f"file=@{photo};type=image/jpeg",
                  f"{BASE}/api/admin/commandes/{order_id}/resultats")
    uploaded = json.loads(result.stdout) if result.stdout.strip().startswith("{") else {}
    check("fichier restauré déposé", bool(uploaded.get("id")), str(uploaded)[:120])
    check("appariement automatique", uploaded.get("paired") is True, str(uploaded.get("paired")))

    page = get(f"/admin/commandes/{order_id}?onglet=resultats")
    check("résultat visible", "restauree" in page or "famille-1954" in page)

    post_form(f"/admin/commandes/{order_id}?onglet=resultats", page,
              {"orderId": order_id}, 'name="orderId"', ADMIN_JAR)
    check("résultats publiés", "ok=publie" in last_status, last_status[:80])

    # --- Documents ---------------------------------------------------------
    print("6. Documents")
    result = curl(ADMIN_JAR, "-o", "/tmp/atelier-admin-originaux.zip",
                  "-w", "%{http_code} %{content_type}",
                  f"{BASE}/api/admin/commandes/{order_id}/originaux")
    check("originaux téléchargeables", result.stdout.startswith("200 application/zip"),
          result.stdout.strip())

    try:
        archive = zipfile.ZipFile("/tmp/atelier-admin-originaux.zip")
        check("archive valide", archive.testzip() is None and len(archive.namelist()) >= 1,
              ", ".join(archive.namelist()[:3]))
    except Exception as error:  # noqa: BLE001
        check("archive valide", False, str(error))

    # --- Journal -----------------------------------------------------------
    print("7. Journal")
    page = get("/admin/journal")
    check("journal alimenté", "order.status_changed" in page)
    check("publication tracée", "order.results_published" in page)
    check("dépôt tracé", "asset.restored_uploaded" in page)

    # --- Clients -----------------------------------------------------------
    print("8. Clients")
    page = get("/admin/clients")
    check("liste des clients", "amel@example.tn" in page or "@" in page)

    # --- Frontière client ↔ admin ------------------------------------------
    print("9. Permissions")
    page = get("/connexion", CLIENT_JAR)
    body = post_form("/connexion", page, {"locale": "fr", "email": "amel@example.tn"},
                     'name="email"', CLIENT_JAR)
    match = re.search(r"/connexion/lien\?t=([A-Za-z0-9_-]+)", body)
    check("session client ouverte", bool(match))
    if match:
        status_of(f"/connexion/lien?t={match.group(1)}", CLIENT_JAR)
        code = status_of("/admin", CLIENT_JAR)
        check("client refusé dans le back-office", code.startswith(("303", "307", "302")), code)

        code = curl(CLIENT_JAR, "-o", "/dev/null", "-w", "%{http_code}",
                    f"{BASE}/api/admin/commandes/{order_id}/originaux").stdout.strip()
        check("client ne peut pas télécharger les originaux", code in {"401", "403"}, code)

    print()
    if failures:
        print(f"{len(failures)} échec(s) :")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print("Back-office : OK")
    print(f"  Commande traitée : {reference} → reçue → résultats publiés")
    return 0


if __name__ == "__main__":
    sys.exit(main())
