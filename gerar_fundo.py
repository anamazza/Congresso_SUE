"""
Gera site/assets/capa-fundo.jpg: a foto do Rio SEM o logo, para usar como
fundo das páginas.

A origem é capa-clara.jpg, a versão clara da arte. Essa foto é em tons de
cinza e o logo, nela, é colorido (vermelho e azul).
O script localiza os pixels coloridos, apaga essa área e preenche o buraco
com a vizinhança da própria foto. Como o fundo aparece bem clareado no site,
o preenchimento não é perceptível.

Uso:  python gerar_fundo.py
"""
import pathlib

import numpy as np
from PIL import Image, ImageFilter

RAIZ = pathlib.Path(__file__).resolve().parent
ORIGEM = RAIZ / "site" / "assets" / "capa-clara.jpg"
ASSETS = RAIZ / "site" / "assets"

LIMITE_COR = 12      # diferença entre canais RGB que denuncia o logo
DILATACAO = 9        # engorda a máscara para pegar as bordas suavizadas
PASSAGENS = 260      # rodadas de preenchimento por difusão

# nome do arquivo, tamanho, desfoque, qualidade do JPEG
VERSOES = [
    ("capa-fundo.jpg", (1280, 720), 2.2, 58),
]


def main() -> None:
    img = Image.open(ORIGEM).convert("RGB")
    arr = np.asarray(img).astype(np.float32)

    # Pixels coloridos = logo (a foto é cinza, com os canais quase iguais)
    saturacao = arr.max(axis=2) - arr.min(axis=2)
    mascara = saturacao > LIMITE_COR

    # Engorda a máscara para cobrir as bordas suavizadas do logo
    m = Image.fromarray((mascara * 255).astype(np.uint8))
    m = m.filter(ImageFilter.MaxFilter(DILATACAO))
    mascara = np.asarray(m) > 0
    print(f"logo cobre {mascara.mean() * 100:.1f}% da imagem")

    # A foto é cinza: trabalha em um canal só
    cinza = arr.mean(axis=2)
    conhecido = ~mascara

    # Preenche o buraco por difusão: repete borrar e recolocar o que é original
    valor = cinza.copy()
    valor[mascara] = cinza[conhecido].mean()
    for _ in range(PASSAGENS):
        borrado = np.asarray(
            Image.fromarray(valor.astype(np.uint8)).filter(ImageFilter.BoxBlur(3)),
            dtype=np.float32,
        )
        valor[mascara] = borrado[mascara]

    saida = np.repeat(valor[:, :, None], 3, axis=2).clip(0, 255).astype(np.uint8)
    limpa = Image.fromarray(saida)

    for nome, tamanho, borrao, qualidade in VERSOES:
        destino = ASSETS / nome
        img_saida = limpa.resize(tamanho, Image.LANCZOS)
        # Um leve desfoque uniformiza a área preenchida com o resto da foto
        img_saida = img_saida.filter(ImageFilter.GaussianBlur(borrao))
        img_saida.save(destino, "JPEG", quality=qualidade, optimize=True, progressive=True)
        print(f"{nome}: {destino.stat().st_size // 1024} KB  {tamanho}")


if __name__ == "__main__":
    main()
