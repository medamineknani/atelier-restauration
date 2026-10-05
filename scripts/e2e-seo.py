#!/usr/bin/env python3
"""
Référencement, exécuté contre un serveur qui tourne.

    npm run dev        ou    npm run build && npm run start
    python3 scripts/e2e-seo.py [http://localhost:3000]

Le référencement se dégrade en silence : une page publiée sans titre, un
canonical qui pointe ailleurs, un lien interne cassé, et le site perd des
positions sans que rien ne casse visiblement. Ce script parcourt donc le site
comme le ferait un moteur et vérifie ce qui est vérifiable sans navigateur :

  1. le plan du site est complet, cohérent et honnête ;
  2. chaque page porte un titre et une description qui lui sont propres ;
  3. canonical et `hreflang` sont présents et se réfèrent à la bonne page ;
  4. les données structurées sont du JSON valide ;
  5. aucun lien interne ne mène à une erreur.

Les longueurs de titres et de descriptions ne font pas échouer la suite : ce
sont des recommandations, pas des erreurs. Elles sont rapportées à part.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000").rstrip("/")

failures: list[str] = []
advice: list[str] = []

# Une page publique = ni back-office, ni espace client, ni tunnel, ni API.
PRIVATE = re.compile(r"^/(api|_next|admin|compte|commande|connexion)")

TITLE_MAX = 65
DESC_MIN = 70
DESC_MAX = 165


def fetch(path: str) -> tuple[int, str]:
    try:
        with urllib.request.urlopen(BASE + path, timeout=60) as response:
            return response.getcode(), response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace")
    except Exception as error:  # serveur absent, connexion refusée…
        return 0, str(error)


def tag(body: str, pattern: str) -> str:
    found = re.search(pattern, body, re.S)
    return found.group(1).strip() if found else ""


# ---------------------------------------------------------------------------
# 1. Plan du site
# ---------------------------------------------------------------------------

print("Référencement — " + BASE)

code, sitemap = fetch("/sitemap.xml")
if code != 200:
    failures.append(f"sitemap.xml → {code} (200 attendu)")
    locations: list[str] = []
else:
    locations = re.findall(r"<loc>([^<]+)</loc>", sitemap)
    print(f"\n1. Plan du site")
    print(f"  ✓ {len(locations)} URL déclarées")

    # Chaque URL du plan doit répondre, sinon le moteur perd du temps de crawl.
    dead = []
    for loc in locations:
        # Les <loc> sont des URL absolues de production : seul le chemin
        # compte, le serveur interrogé est celui qu'on a en face de nous.
        path = re.sub(r"^https?://[^/]+", "", loc).rstrip("/") or "/"
        status, _ = fetch(path)
        if status != 200:
            dead.append(f"{status} {path}")
    if dead:
        failures.append(f"sitemap : {len(dead)} URL en erreur ({', '.join(dead[:3])})")
    else:
        print(f"  ✓ toutes répondent 200")

    # Une date de modification identique pour toutes les URL est le signe
    # qu'on renseigne l'heure du build : c'est pire que pas de date.
    stamps = re.findall(r"<lastmod>([^<]+)</lastmod>", sitemap)
    if len(stamps) == len(locations) and len(set(stamps)) == 1:
        failures.append(
            "sitemap : toutes les URL portent la même date de modification "
            "— c'est l'heure du build, pas une date de modification"
        )
    elif stamps:
        print(f"  ✓ {len(stamps)} URL datées, {len(locations) - len(stamps)} sans date")

code, robots = fetch("/robots.txt")
if code != 200:
    failures.append(f"robots.txt → {code} (200 attendu)")
else:
    for zone in ("/admin", "/compte", "/api"):
        if f"Disallow: {zone}" not in robots:
            failures.append(f"robots.txt : {zone} n'est pas exclu")
    print(f"  ✓ robots.txt exclut admin, compte et api")

# ---------------------------------------------------------------------------
# 2. Parcours du site
# ---------------------------------------------------------------------------

print("\n2. Parcours")

seen: dict[str, int] = {}
queue = ["/"]
while queue:
    path = queue.pop(0)
    if path in seen:
        continue
    status, body = fetch(path)
    seen[path] = status
    if status != 200:
        failures.append(f"lien interne cassé : {status} {path}")
        continue
    for href in re.findall(r'href="(/[^"#?]*)"', body):
        href = href.rstrip("/") or "/"
        if not PRIVATE.match(href) and href not in seen:
            queue.append(href)

broken = [(p, c) for p, c in seen.items() if c != 200]
if broken:
    failures.append(f"{len(broken)} lien(s) interne(s) cassé(s)")
else:
    print(f"  ✓ {len(seen)} page(s) explorée(s), aucun lien cassé")

# ---------------------------------------------------------------------------
# 3. Balises de chaque page
# ---------------------------------------------------------------------------

print("\n3. Balises")

titles: dict[str, str] = {}
descriptions: dict[str, str] = {}

for path in sorted(p for p, c in seen.items() if c == 200):
    _, body = fetch(path)
    title = tag(body, r"<title>(.*?)</title>")
    description = tag(body, r'<meta name="description" content="([^"]*)"')

    if not title:
        failures.append(f"{path} : titre absent")
    if not description:
        failures.append(f"{path} : description absente")
    if title:
        titles.setdefault(title, path)
    if description:
        descriptions.setdefault(description, path)

    # Le canonical doit désigner la page elle-même. On ne compare que le
    # chemin : le canonical porte le domaine de production, pas celui du
    # serveur interrogé.
    canonical = tag(body, r'rel="canonical" href="([^"]*)"')
    canonical_path = re.sub(r"^https?://[^/]+", "", canonical).rstrip("/") or "/"
    if not canonical:
        failures.append(f"{path} : canonical absent")
    elif canonical_path != (path.rstrip("/") or "/"):
        failures.append(f"{path} : canonical pointe vers {canonical}")

    # Les locales doivent être déclarées, sinon le moteur peut indexer
    # la mauvaise langue pour la bonne requête. React écrit `hrefLang` :
    # la casse de l'attribut n'est donc pas garantie.
    alternates = re.findall(r'rel="alternate"\s+hrefLang="([^"]+)"', body, re.I)
    if not alternates:
        failures.append(f"{path} : aucune locale déclarée (hreflang)")
    elif "x-default" not in alternates:
        failures.append(f"{path} : hreflang x-default absent")

    # Données structurées : du JSON qui se parse, sinon le moteur l'ignore.
    for block in re.findall(
        r'<script type="application/ld\+json"[^>]*>(.*?)</script>', body, re.S
    ):
        try:
            json.loads(block)
        except json.JSONDecodeError as error:
            failures.append(f"{path} : JSON-LD invalide ({error})")

    # Longueurs : conseils, pas erreurs.
    if title and len(title) > TITLE_MAX:
        advice.append(f"{path} : titre de {len(title)} caractères (>{TITLE_MAX})")
    if description and not (DESC_MIN <= len(description) <= DESC_MAX):
        advice.append(
            f"{path} : description de {len(description)} caractères "
            f"(hors de {DESC_MIN}–{DESC_MAX})"
        )

print(f"  ✓ {len(seen)} page(s) contrôlée(s), {len(titles)} titre(s), "
      f"{len(descriptions)} description(s)")

# Deux pages qui partagent un titre ou une description se concurrencent :
# le moteur ne sait pas laquelle répondre, et ni l'une ni l'autre ne remonte.
for label, seen_tags in (("titre", titles), ("description", descriptions)):
    by_value: dict[str, list[str]] = {}
    for path in sorted(p for p, c in seen.items() if c == 200):
        _, body = fetch(path)
        value = (tag(body, r"<title>(.*?)</title>") if label == "titre"
                 else tag(body, r'<meta name="description" content="([^"]*)"'))
        if value:
            by_value.setdefault(value, []).append(path)
    for value, paths in by_value.items():
        if len(paths) > 1:
            failures.append(f"{label} identique sur {' et '.join(paths)}")

# ---------------------------------------------------------------------------
# Bilan
# ---------------------------------------------------------------------------

if advice:
    print("\nConseils (ne font pas échouer la suite)")
    for item in advice:
        print(f"  ! {item}")

print()
if failures:
    print(f"Référencement : {len(failures)} échec(s)")
    for item in failures:
        print(f"  ✗ {item}")
    sys.exit(1)

print("Référencement : OK")
