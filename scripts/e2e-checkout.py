#!/usr/bin/env python3
"""
Parcours de commande complet, exécuté contre un serveur de développement.

    npm run dev
    python3 scripts/e2e-checkout.py [http://localhost:3000]

Le script enchaîne les sept étapes du tunnel **comme le ferait un navigateur
sans JavaScript** : il lit les formulaires rendus par le serveur et les
rejoue en POST. C'est donc aussi un test de l'amélioration progressive —
si le tunnel cesse de fonctionner sans JS, ce script échoue.

Il nécessite `NODE_ENV != production` (route `/api/dev/draft`).
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
JAR = "/tmp/atelier-e2e-cookies.txt"
if os.path.exists(JAR):
    os.remove(JAR)

failures: list[str] = []


def curl(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["curl", "-s", "-b", JAR, "-c", JAR, *args],
        capture_output=True,
        text=True,
    )


def get(path: str) -> str:
    out = f"/tmp/atelier-e2e{path.replace('/', '_')}.html"
    result = curl("-o", out, "-w", "%{http_code}", f"{BASE}{path}")
    code = result.stdout.strip()
    if code != "200":
        failures.append(f"GET {path} → {code} (200 attendu)")
        return ""
    return open(out, encoding="utf-8").read()


def check(label: str, ok: bool, detail: str = "") -> None:
    print(("  ✓ " if ok else "  ✗ ") + label + (f" — {detail}" if detail else ""))
    if not ok:
        failures.append(label)


def action_fields(page: str, marker: str) -> dict[str, str]:
    """
    Champs cachés que Next ajoute au formulaire contenant `marker`.

    Une page peut exposer plusieurs formulaires (ici : confirmer et annuler) ;
    prendre les identifiants du mauvais déclencherait la mauvaise action.
    """
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


def post_form(path: str, page: str, data: dict[str, str], marker: str) -> str:
    args = ["-o", "/tmp/atelier-e2e-post.html", "-w", "%{http_code} %{redirect_url}", "-X", "POST",
            "-H", f"Origin: {BASE}"]
    for key, value in action_fields(page, marker).items():
        args += ["-F", f"{key}={value}"]
    for key, value in data.items():
        args += ["-F", f"{key}={value}"]
    result = curl(*args, f"{BASE}{path}")
    return result.stdout.strip()


def main() -> int:
    print(f"Parcours de commande — {BASE}\n")

    # --- Brouillon --------------------------------------------------------
    print("1. Brouillon")
    result = curl("-X", "DELETE", f"{BASE}/api/dev/draft")
    check("nettoyage", result.returncode == 0)

    result = curl("-X", "POST", "-H", "content-type: application/json",
                  "-d", '{"kind":"digital"}', f"{BASE}/api/dev/draft")
    draft = json.loads(result.stdout)
    reference = draft["reference"]
    check("brouillon créé", bool(draft.get("orderId")), reference)

    # --- Étape 2 : pack ---------------------------------------------------
    print("2. Pack")
    page = get("/commande/pack")
    slugs = re.findall(r'name="pack" value="([^"]+)"', page)
    check("packs proposés", len(slugs) >= 3, ", ".join(slugs))
    status = post_form("/commande/pack", page, {"locale": "fr", "pack": slugs[1]}, 'name="pack"')
    check("pack choisi", status.startswith("303"), status)

    draft = json.loads(curl(f"{BASE}/api/dev/draft").stdout)["draft"]
    check("total mis à jour", draft["totalMillimes"] > 0, f"{draft['totalMillimes'] / 1000:g} DT")

    # --- Étape 3 : options ------------------------------------------------
    print("3. Options")
    page = get("/commande/extras")
    extra_ids = re.findall(r'name="extra:([0-9a-f-]+)"', page)
    check("options proposées", len(extra_ids) > 0, f"{len(extra_ids)} option(s)")
    payload = {extra_ids[0]: 2} if extra_ids else {}
    status = post_form("/commande/extras", page,
                       {"locale": "fr", "extrasPayload": json.dumps(payload)},
                       'name="extrasPayload"')
    check("options enregistrées", status.startswith("303"), status)

    # --- Étape 4 : photos -------------------------------------------------
    print("4. Photos")
    page = get("/commande/photos")
    check("zone d'envoi présente", "dropzone" in page or "Choisir depuis mon téléphone" in page)

    photo = "assets/sources/famille-1954.jpg"
    result = curl("-F", f"file=@{photo};type=image/jpeg", f"{BASE}/api/uploads/local")
    uploaded = json.loads(result.stdout) if result.stdout.strip().startswith("{") else {}
    check("photo envoyée", bool(uploaded.get("id")), uploaded.get("filename", result.stdout[:80]))

    # --- Étape 5 : coordonnées -------------------------------------------
    print("5. Coordonnées")
    page = get("/commande/coordonnees")
    status = post_form("/commande/coordonnees", page, {
        "locale": "fr",
        "firstName": "Amel",
        "lastName": "Ben Salah",
        "email": "amel@example.tn",
        "phone": "+216 20 123 456",
        "notes": "La photo de mariage est très abîmée.",
    }, 'name="firstName"')
    check("coordonnées enregistrées", status.startswith("303"), status)

    page = get("/commande/recapitulatif")
    check("récapitulatif complet",
          all(text in page for text in ["Amel Ben Salah", "amel@example.tn"]))

    # --- Étape 6 : confirmation ------------------------------------------
    print("6. Confirmation")
    page = get("/commande/recapitulatif")
    status = post_form("/commande/recapitulatif", page,
                       {"locale": "fr", "provider": "manual"}, 'name="provider"')
    check("commande soumise", status.startswith("303"), status)

    redirect_url = status.split(" ", 1)[1] if " " in status else ""
    token = urllib.parse.parse_qs(urllib.parse.urlparse(redirect_url).query).get("t", [""])[0]
    check("jeton invité délivré", bool(token))

    page = get(f"/commande/confirmation/{reference}?t={token}")
    check("page de confirmation", reference in page and "Prochaine étape" in page)

    page = get(f"/commande/suivi/{reference}?t={token}")
    check("page de suivi", "En attente de paiement" in page)

    # --- Sécurité ---------------------------------------------------------
    print("7. Sécurité")
    result = curl("-o", "/dev/null", "-w", "%{http_code}",
                  f"{BASE}/commande/confirmation/{reference}")
    check("confirmation protégée sans jeton", result.stdout.strip() in {"404", "403"},
          result.stdout.strip())

    result = curl("-o", "/dev/null", "-w", "%{http_code}",
                  f"{BASE}/api/files/{uploaded.get('id', 'x')}")
    check("original protégé", result.stdout.strip() in {"403", "404"}, result.stdout.strip())

    print()
    if failures:
        print(f"{len(failures)} échec(s) :")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print("Parcours complet : OK")
    print("Emails : vider la file avec")
    print(f"  curl -H 'authorization: Bearer $CRON_SECRET' -X POST {BASE}/api/jobs/run")
    return 0


if __name__ == "__main__":
    sys.exit(main())
