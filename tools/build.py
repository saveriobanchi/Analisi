#!/usr/bin/env python3
"""Build Monte Analisi into one self-contained HTML file.

Outputs:
  dist/index.html     full document (open locally or serve with GitHub Pages)
  dist/artifact.html  same page without <!doctype>/<html>/<head>/<body> wrappers,
                      as required by claude.ai Artifacts (they add the skeleton).
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist"

CSS_FILES = ["css/app.css"]
JS_FILES = ["js/core.js", "js/plot.js", "js/map.js", "js/quiz.js", "js/labs.js", "js/views.js", "js/main.js"]


def icon_sprite():
    out = []
    for f in sorted((ROOT / "assets" / "icons").glob("*.svg")):
        s = f.read_text()
        vb = re.search(r'viewBox="([^"]+)"', s).group(1)
        inner = re.sub(r"^<svg[^>]*>|</svg>\s*$", "", s.strip())
        out.append(f'<symbol id="i-{f.stem}" viewBox="{vb}">{inner}</symbol>')
    return '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">' + "".join(out) + "</svg>"


def content_blocks():
    out = []
    for f in sorted((SRC / "content").glob("ch*.txt")):
        txt = f.read_text()
        if "</script" in txt.lower():
            sys.exit(f"{f.name}: contains </script")
        out.append(f'<script type="text/plain" class="chapter-src" data-file="{f.stem}">\n{txt}\n</script>')
    return "\n".join(out)


def main():
    tpl = (SRC / "index.html").read_text()
    css = "\n".join((SRC / p).read_text() for p in CSS_FILES)
    js = "\n;\n".join((SRC / p).read_text() for p in JS_FILES)
    if "</script" in js.lower():
        sys.exit("JS contains </script")
    page = (tpl.replace("/*@CSS@*/", css)
               .replace("<!--@ICONS@-->", icon_sprite())
               .replace("<!--@CONTENT@-->", content_blocks())
               .replace("/*@JS@*/", js))
    DIST.mkdir(exist_ok=True)
    full = "<!doctype html>\n<html lang=\"it\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n</head>\n<body>\n" + page + "\n</body>\n</html>\n"
    (DIST / "index.html").write_text(full)
    (DIST / "artifact.html").write_text(page)
    kb = len(page.encode()) / 1024
    print(f"built dist/index.html and dist/artifact.html ({kb:.0f} KB)")


if __name__ == "__main__":
    main()
