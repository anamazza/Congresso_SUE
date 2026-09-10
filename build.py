"""
Gera versões "arquivo único" do site (CSS, JS e imagens embutidos):

  dist/index.html     -> página completa, pronta para hospedar ou enviar por e-mail
  dist/artifact.html  -> mesmo conteúdo sem <html>/<head>/<body>, para publicar como Artifact

Uso:  python build.py
"""
import base64
import mimetypes
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parent
SITE = RAIZ / "site"
DIST = RAIZ / "dist"


def data_uri(rel: str) -> str:
    caminho = SITE / rel
    mime = mimetypes.guess_type(caminho.name)[0] or "application/octet-stream"
    if caminho.suffix == ".docx":
        mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return f"data:{mime};base64," + base64.b64encode(caminho.read_bytes()).decode("ascii")


def main() -> None:
    DIST.mkdir(exist_ok=True)
    html = (SITE / "index.html").read_text(encoding="utf-8")
    css = (SITE / "css" / "style.css").read_text(encoding="utf-8")
    js = (SITE / "js" / "main.js").read_text(encoding="utf-8")

    # O edital referenciado no CONFIG também vai embutido
    js = js.replace('"assets/Edital.docx"', '"' + data_uri("assets/Edital.docx") + '"')

    # Imagens citadas no CSS, por exemplo url("../assets/capa.jpg")
    def embutir_css(m: re.Match) -> str:
        return 'url("' + data_uri("assets/" + m.group(1)) + '")'

    css = re.sub(r'url\(\s*["\']?\.\./assets/([^"\')]+)["\']?\s*\)', embutir_css, css)

    html = html.replace('<link rel="stylesheet" href="css/style.css">', "<style>\n" + css + "\n</style>")
    html = html.replace('<script src="js/main.js"></script>', "<script>\n" + js + "\n</script>")

    def embutir(m: re.Match) -> str:
        atributo, rel = m.group(1), m.group(2)
        return f'{atributo}="{data_uri(rel)}"'

    html = re.sub(r'\b(src|href)="(assets/[^"]+)"', embutir, html)

    (DIST / "index.html").write_text(html, encoding="utf-8")

    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    body = re.search(r"<body[^>]*>(.*?)</body>", html, re.S).group(1)
    # O visualizador de Artifacts não permite downloads: o botão do edital sai dessa versão
    body = re.sub(r'<a[^>]*\bdownload\b[^>]*>.*?</a>\s*', "", body, flags=re.S)
    manter = re.findall(
        r'<title>.*?</title>|<link rel="preconnect"[^>]*>|<link rel="stylesheet"[^>]*>|<style>.*?</style>',
        head,
        re.S,
    )
    (DIST / "artifact.html").write_text("\n".join(manter) + "\n" + body, encoding="utf-8")

    for nome in ("index.html", "artifact.html"):
        tamanho = (DIST / nome).stat().st_size
        print(f"dist/{nome}: {tamanho / 1024:.0f} KB")


if __name__ == "__main__":
    main()
