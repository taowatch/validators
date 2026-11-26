#!/usr/bin/env python3
"""Build the web pages from the design files.

The design files are the source of truth for markup and view logic:
  design/App.dc.html   →  web/index.html     + web/app.js        "Choose a validator" + validator pages
  design/Main.dc.html  →  web/analytics.html + web/analytics.js  analytics (served at /analytics)

Each design is split into the <head> (from its <helmet>), the <x-dc> markup inside a
<template>, and its `class Component extends DCLogic` script with the data URLs pointed at
the API. The pages run on web/dc-lite.js.

Usage: python3 tools/dc2web.py [web]   (run from the repository root)
"""
import hashlib
import re
import sys
from pathlib import Path

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "web")

PAGES = [
    {
        "src": Path("design/App.dc.html"),
        "html": "index.html",
        "js": "app.js",
        "title": "Choose a validator · Validator Yield · Bittensor",
        "desc": "Pick a Bittensor validator: every root and subnet validator graded on what it pays stakers, after fees, from on-chain data.",
        "urls": {"DATA_URL": "/api/choose", "VALIDATOR_URL": "/api/validator/"},
    },
    {
        "src": Path("design/Main.dc.html"),
        "html": "analytics.html",
        "js": "analytics.js",
        "title": "Analytics · Validator Yield · Bittensor",
        "desc": "Bittensor validators ranked by root-claim and alpha yield, computed from on-chain data.",
        "urls": {"DATA_URL": "/api/validators", "ALPHA_URL": "/api/alpha"},
    },
]


def build(page, v_lite):
    src = page["src"]

    def fail(msg):
        sys.exit(f"dc2web: {src}: {msg}")

    def one(pattern, text, what):
        """The single match of `pattern` (group 1), or exit with a readable error."""
        found = re.findall(pattern, text, re.S)
        if len(found) != 1:
            fail(f"expected exactly one {what}, found {len(found)}")
        return found[0]

    if not src.is_file():
        sys.exit(f"dc2web: {src} not found (run from the repository root)")
    html = src.read_text(encoding="utf-8")
    helmet = one(r"<helmet>(.*?)</helmet>", html, "<helmet>…</helmet> block").strip()
    xdc = one(r"<x-dc>(.*?)</x-dc>", html, "<x-dc>…</x-dc> block")
    markup = re.sub(r"<helmet>.*?</helmet>", "", xdc, flags=re.S).strip()
    script = one(r'<script type="text/x-dc"[^>]*>(.*?)</script>', html, '<script type="text/x-dc"> block').strip()
    if not markup:
        fail("the <x-dc> block has no markup besides <helmet>")
    if not re.search(r"\bclass\s+Component\s+extends\s+DCLogic\b", script):
        fail("the design script must define `class Component extends DCLogic`")

    for name, url in page["urls"].items():
        script, n = re.subn(rf"const {name} = '[^']*';", f"const {name} = '{url}';", script)
        if n != 1:
            fail(f"expected one `const {name} = '…';` in the script, found {n}")

    # Content hashes in the script URLs: a CDN or browser can keep each file forever, and a
    # new page always pulls the matching scripts.
    js = f"// Generated from {src} by tools/dc2web.py — edit the design, then rerun.\n" + script + "\n"
    v_js = hashlib.sha256(js.encode()).hexdigest()[:12]
    index = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{page["title"]}</title>
<meta name="description" content="{page["desc"]}">
<meta name="color-scheme" content="dark">
{helmet}
</head>
<body>
<div id="app"></div>
<template id="tpl">
{markup}
</template>
<script src="/dc-lite.js?v={v_lite}"></script>
<script src="/{page["js"]}?v={v_js}"></script>
<script>DCMount(Component, document.getElementById('tpl'), document.getElementById('app'), {{}});</script>
</body>
</html>
"""
    (OUT / page["html"]).write_text(index, encoding="utf-8")
    (OUT / page["js"]).write_text(js, encoding="utf-8")
    print(f"wrote {OUT / page['html']} ({len(index)} bytes), {OUT / page['js']} ({len(js)} bytes)")


OUT.mkdir(parents=True, exist_ok=True)
lite = OUT / "dc-lite.js"
if not lite.is_file():
    sys.exit(f"dc2web: {lite} not found")
v_lite = hashlib.sha256(lite.read_bytes()).hexdigest()[:12]
for p in PAGES:
    build(p, v_lite)
