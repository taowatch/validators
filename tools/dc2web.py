#!/usr/bin/env python3
"""Build web/index.html + web/app.js from the design file design/Main.dc.html.

The design file is the source of truth for markup and view logic.
This splits it into:
  web/index.html  <head> from the <helmet>, the <x-dc> markup inside a <template>
  web/app.js      the `class Component extends DCLogic` script, with the data URLs
                  pointed at the API (/api/validators, /api/alpha)
and the page runs on web/dc-lite.js.

Usage: python3 tools/dc2web.py [design/Main.dc.html] [web]
"""
import re
import sys
from pathlib import Path

src = Path(sys.argv[1] if len(sys.argv) > 1 else "design/Main.dc.html")
out = Path(sys.argv[2] if len(sys.argv) > 2 else "web")
if not src.is_file():
    sys.exit(f"dc2web: {src} not found (run from the repository root or pass the design path)")
html = src.read_text(encoding="utf-8")



def fail(msg):
    sys.exit(f"dc2web: {src}: {msg}")


def one(pattern, text, what):
    """The single match of `pattern` (group 1), or exit with a readable error."""
    found = re.findall(pattern, text, re.S)
    if len(found) != 1:
        fail(f"expected exactly one {what}, found {len(found)}")
    return found[0]


helmet = one(r"<helmet>(.*?)</helmet>", html, "<helmet>…</helmet> block").strip()
xdc = one(r"<x-dc>(.*?)</x-dc>", html, "<x-dc>…</x-dc> block")
markup = re.sub(r"<helmet>.*?</helmet>", "", xdc, flags=re.S).strip()
script = one(r'<script type="text/x-dc"[^>]*>(.*?)</script>', html, '<script type="text/x-dc"> block').strip()
if not markup:
    fail("the <x-dc> block has no markup besides <helmet>")
if not re.search(r"\bclass\s+Component\s+extends\s+DCLogic\b", script):
    fail("the design script must define `class Component extends DCLogic`")

script, n1 = re.subn(r"const DATA_URL = '[^']*';", "const DATA_URL = '/api/validators';", script)
script, n2 = re.subn(r"const ALPHA_URL = '[^']*';", "const ALPHA_URL = '/api/alpha';", script)
if n1 != 1 or n2 != 1:
    fail(f"expected one `const DATA_URL = '…';` and one `const ALPHA_URL = '…';` in the script, found {n1} and {n2}")

index = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Validator Yield · Bittensor</title>
<meta name="description" content="Bittensor validators ranked by root-claim and alpha yield, computed from on-chain data.">
<meta name="color-scheme" content="dark">
{helmet}
</head>
<body>
<div id="app"></div>
<template id="tpl">
{markup}
</template>
<script src="/dc-lite.js"></script>
<script src="/app.js"></script>
<script>DCMount(Component, document.getElementById('tpl'), document.getElementById('app'), {{}});</script>
</body>
</html>
"""
out.mkdir(parents=True, exist_ok=True)
(out / "index.html").write_text(index, encoding="utf-8")
(out / "app.js").write_text("// Generated from design/Main.dc.html by tools/dc2web.py — edit the design, then rerun.\n" + script + "\n", encoding="utf-8")
print(f"wrote {out/'index.html'} ({len(index)} bytes), {out/'app.js'} ({len(script)} bytes)")
