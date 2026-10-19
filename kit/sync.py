#!/usr/bin/env python3
"""Inline the A² Kit into single-file platform pages (idempotent).

Usage:  python3 kit/sync.py path/to/page.html [more.html ...]

Each page keeps working as one self-contained file. The kit is placed
between marker comments so re-running this script after a kit update
replaces it in place:

  <!-- a2-kit:fonts --> ... <!-- /a2-kit:fonts -->   font preconnect + stylesheet
  <!-- a2-kit:css v1.0.0 --> <style id="a2-kit-css">…</style> <!-- /a2-kit:css -->
  <!-- a2-kit:js v1.0.0 --> <script id="a2-kit-js">…</script> <!-- /a2-kit:js -->

Placement on first run: fonts + css go right after the viewport meta (so the
platform's own CSS, which comes later, can override kit defaults); js goes
before the first <script> in the document (so the audio manager is installed
before any platform code can play sound), or before </head>.
"""
import pathlib
import re
import sys

KIT = pathlib.Path(__file__).resolve().parent
CSS = (KIT / "a2-kit.css").read_text(encoding="utf-8")
JS = (KIT / "a2-kit.js").read_text(encoding="utf-8")
VERSION = re.search(r"v(\d+\.\d+\.\d+)", CSS).group(1)

FONTS = (
    '<!-- a2-kit:fonts -->\n'
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600'
    '&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">\n'
    '<!-- /a2-kit:fonts -->'
)
CSS_BLOCK = f'<!-- a2-kit:css v{VERSION} -->\n<style id="a2-kit-css">\n{CSS}</style>\n<!-- /a2-kit:css -->'
JS_BLOCK = f'<!-- a2-kit:js v{VERSION} -->\n<script id="a2-kit-js">\n{JS}</script>\n<!-- /a2-kit:js -->'


def replace_block(html, name, block):
    rx = re.compile(r"<!-- a2-kit:%s[^>]*-->.*?<!-- /a2-kit:%s -->" % (name, name), re.S)
    if rx.search(html):
        return rx.sub(lambda _m: block, html, count=1), True
    return html, False


def insert_after_head_meta(html, block):
    m = re.search(r'<meta[^>]+name=["\']viewport["\'][^>]*>', html, re.I) or re.search(r"<meta[^>]+charset[^>]*>", html, re.I) or re.search(r"<head[^>]*>", html, re.I)
    if not m:
        raise SystemExit("no <head> found")
    return html[: m.end()] + "\n" + block + html[m.end():]


def sync(path):
    p = pathlib.Path(path)
    html = p.read_text(encoding="utf-8")
    html, had_fonts = replace_block(html, "fonts", FONTS)
    html, had_css = replace_block(html, "css", CSS_BLOCK)
    html, had_js = replace_block(html, "js", JS_BLOCK)
    if not had_css:
        html = insert_after_head_meta(html, (FONTS + "\n" if not had_fonts else "") + CSS_BLOCK)
    elif not had_fonts:
        html = insert_after_head_meta(html, FONTS)
    if not had_js:
        # first <script> that is not the kit itself
        m = re.search(r"<script\b(?![^>]*id=\"a2-kit-js\")", html, re.I)
        head_end = html.lower().find("</head>")
        pos = m.start() if m else head_end
        if pos < 0:
            raise SystemExit(f"{path}: no <script> or </head> to anchor the kit")
        html = html[:pos] + JS_BLOCK + "\n" + html[pos:]
    p.write_text(html, encoding="utf-8")
    print(f"a2-kit v{VERSION} -> {path} ({'updated' if had_css else 'inserted'})")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    for f in sys.argv[1:]:
        sync(f)
