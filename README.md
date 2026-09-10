# Site do 1º Simpósio de Urgência e Emergência

Site institucional do simpósio da Secretaria Municipal de Saúde do Rio de Janeiro (SUBHUE),
27 e 28 de novembro de 2026, UNIGRANRIO Campus Barra da Tijuca.

Feito em HTML, CSS e JavaScript puros, sem dependências. Funciona em qualquer hospedagem
de arquivos estáticos e também como um único arquivo HTML.

O site tem menu suspenso no topo (Informações, Programação, Trabalhos) e páginas separadas:
Home, O evento, Programação, Palestrantes, Inscrições, Trabalhos, Normas de submissão,
Comissões, Local, Datas importantes, Perguntas frequentes, Realização e apoio, Avisos,
Contato e Privacidade. Todas as páginas ficam no mesmo `index.html`, uma por `<section
data-pagina="...">`; o menu abre uma de cada vez pelos links `#/pagina` (por exemplo,
`index.html#/programacao`). O menu é escrito uma única vez e vale para todas as páginas.

Palestrantes, Comissões e Avisos só aparecem (no menu e no rodapé) quando as listas
correspondentes em `site/js/main.js` estão preenchidas. O aviso mais recente também aparece
em destaque na Home.

## Estrutura

```
site/
  index.html        menu + uma <section data-pagina="..."> por página (texto do edital)
  css/style.css     visual (cores do logo, tipografia, layout, menu suspenso)
  js/main.js        bloco CONFIG com links, datas, contatos, comissões e palestrantes,
                    e a troca de páginas pelo menu
  assets/           capa.jpg (arte colorida do topo da Home), capa-fundo.jpg (fundo das
                    páginas), capa-clara.jpg (versão clara, só serve de origem para o fundo),
                    linha-batimentos.png (traçado de ECG da marca, usado sob a faixa do topo),
                    logo.png (logo compacto colorido), logo-branco.png (logo compacto branco,
                    usado no menu e no rodapé), favicon e edital
gerar_fundo.py      recria capa-fundo.jpg a partir de capa-clara.jpg, sem o logo

Os arquivos originais enviados pela equipe de design ficam na raiz do projeto
(`arte-capa-colorida-v2.png`, `linha-batimentos.png`, `logo-compacto-*.png` e os anteriores).
As versões em `site/assets/` são cópias otimizadas para a web.
build.py            gera a versão "arquivo único" em dist/
dist/
  index.html        site completo em um único arquivo (pronto para hospedar ou enviar)
  artifact.html     versão para publicar como Artifact no Claude
```

Para criar uma página nova: copie uma `<section class="pagina" data-pagina="nome" data-titulo="Título" hidden>`
em `site/index.html`, dê um nome único em `data-pagina` e acrescente um link `#/nome` no menu.

## Imagem de fundo

A foto do Rio aparece em duas formas:

- **Faixa do topo da Home**: `capa.jpg`, a arte colorida, de ponta a ponta. A altura da faixa
  acompanha a largura da tela na proporção 1600:690. O conjunto do logo ocupa 600 de altura na
  arte e os 90 restantes viram folga acima e abaixo dele; por isso o corte só tira céu e
  cidade, e o logo nunca encosta na borda. Para mais folga, aumente o segundo número de
  `aspect-ratio` em `.hero__capa img` (a faixa fica mais alta); para menos, diminua. É também
  a imagem que aparece quando o link é compartilhado.
- **Fundo de todas as páginas**: `capa-fundo.jpg`, a mesma paisagem em tons de cinza e sem o
  logo, bem clareada. Para deixá-la mais forte ou mais fraca, mude `--fundo-forca` no topo de
  `site/css/style.css`. O valor vai de 0 (sem foto) a 1 (foto cheia); hoje está em 0.13.

O fundo é gerado por `python gerar_fundo.py` a partir de `capa-clara.jpg`, a versão clara da
arte. Nessa versão a foto é cinza e o logo é colorido, então o script consegue localizar o
logo pela cor, apagá-lo e preencher a área com a vizinhança da própria foto. Assim o logo não
aparece duplicado atrás do conteúdo. O arquivo `capa-clara.jpg` não é carregado pelo site;
serve só de origem para o script.

Se a arte mudar, substitua `site/assets/capa.jpg`. Se a versão clara também mudar, substitua
`site/assets/capa-clara.jpg` e rode o script de novo.

## Como atualizar o conteúdo

1. **Links, datas e contatos**: abra `site/js/main.js` e preencha o bloco `CONFIG` no topo.
   Tudo o que ficar `""` aparece no site como "a divulgar" ou "em breve".
   - `inscricoes.url` e `submissao.url` ativam os botões "Inscreva-se" e "Submeter trabalho".
   - `comissao` e `palestrantes` fazem aparecer as seções correspondentes (ocultas enquanto vazias).
2. **Horários da programação**: em `site/index.html`, preencha os `<span class="hora"></span>`
   de cada atividade, por exemplo `<span class="hora">08h30</span>`. Vazio mostra "a confirmar".
3. **Textos das seções**: edite diretamente em `site/index.html`.
4. **Edital final**: substitua `site/assets/Edital.docx` (ou aponte `edital.url` para o PDF).

## Como gerar a versão de arquivo único

```bash
python build.py
```

Gera `dist/index.html` com CSS, JavaScript, logos e edital embutidos.

## Como publicar

### GitHub Pages (em uso)

O projeto está no repositório <https://github.com/anamazza/Congresso_SUE> e o site é publicado
em **<https://anamazza.github.io/Congresso_SUE/>**.

O arquivo `.github/workflows/pages.yml` copia a pasta `site/` para a branch `gh-pages` a cada
envio para a branch `main`, e o GitHub Pages publica essa branch. Se a publicação não
acontecer, confira no repositório **Settings > Pages > Build and deployment**: Source em
**Deploy from a branch**, branch **gh-pages**, pasta **/ (root)**.

Para atualizar o site: edite os arquivos em `site/`, faça o commit e envie (`git push`).
Em um ou dois minutos a versão nova está no ar.

A pasta `site/` já traz o que o Pages precisa: `.nojekyll`, `404.html` (página de erro que
leva de volta ao início) e `robots.txt`.

### Outras opções

- **Hospedagem da prefeitura**: envie a pasta `site/` inteira (ou apenas `dist/index.html`) para a TI.
- **Netlify, Vercel ou similares**: publique a pasta `site/`. Não precisa de build.

### Pendências antes da divulgação

- As tags `og:image`, `og:url` e `canonical` em `site/index.html` apontam para o endereço do
  GitHub Pages. Se o site ganhar um domínio próprio, troque as três.
- Confira os textos das páginas **Normas de submissão** e **Privacidade** com a Comissão
  Científica e com o setor responsável pela LGPD. Os dois foram escritos a partir do edital e
  das práticas comuns em eventos de saúde, e trazem marcações "a divulgar" onde faltam decisões.

Fontes (Montserrat e Source Sans 3) são carregadas do Google Fonts. Sem internet, o site cai
para as fontes do sistema sem quebrar o layout.
