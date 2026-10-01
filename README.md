# Site do 1º Simpósio de Urgência e Emergência

Site institucional do simpósio da Secretaria Municipal de Saúde do Rio de Janeiro (SUBHUE),
03 e 04 de dezembro de 2026, UNIGRANRIO Campus Barra da Tijuca.

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
   - `formulario.linkPreenchido` liga o formulário de inscrição. Veja a seção abaixo.
   - `submissao.url` ativa o botão "Submeter trabalho".
   - `inscricoes.url` só precisa ser preenchido se as inscrições passarem a ser feitas em outro
     site. Com o formulário ligado, os botões "Inscreva-se" levam até ele.
   - `comissao` e `palestrantes` fazem aparecer as seções correspondentes (ocultas enquanto vazias).
2. **Horários da programação**: em `site/index.html`, preencha os `<span class="hora"></span>`
   de cada atividade, por exemplo `<span class="hora">08h30</span>`. Vazio mostra "a confirmar".
3. **Textos das seções**: edite diretamente em `site/index.html`.
4. **Edital final**: substitua `site/assets/Edital.docx` (ou aponte `edital.url` para o PDF).

## Formulário de inscrição

A página Inscrições tem um formulário próprio, com a identidade visual do site. Como o site não
tem servidor, as respostas vão para um Google Forms, que as guarda numa planilha do Google.
Enquanto o link não estiver configurado, o formulário aparece com o envio desligado e um aviso,
para ninguém achar que se inscreveu.

O formulário pede nome completo, CPF, e-mail, celular, categoria profissional, instituição e se
a pessoa pretende submeter trabalho. Ele confere o CPF, o e-mail e o celular antes de enviar, e
exige o aceite do edital e do aviso de privacidade.

### Como ligar o formulário

1. Numa conta Google institucional, crie um formulário no Google Forms com sete perguntas do tipo
   **Resposta curta**, nesta ordem: Nome completo, CPF, E-mail, Celular, Categoria profissional,
   Instituição ou unidade, Pretende submeter trabalho. Use Resposta curta em todas, inclusive na
   categoria, porque as opções já são controladas pelo site.
2. Não marque nenhuma pergunta como obrigatória e não ative validação de resposta. O site já
   confere os dados, e uma regra diferente no Google faz a inscrição ser descartada sem aviso.
3. Em **Configurações > Respostas**, deixe "Coletar endereços de e-mail" em **Não coletar** e
   desligue **Limitar a 1 resposta**. Essas duas opções exigem login no Google e bloqueiam o
   envio pelo site.
4. No menu de três pontos do formulário, escolha **Gerar link pré-preenchido**. Em cada pergunta,
   escreva apenas a palavra-chave da tabela, sem acento:

   | Pergunta                    | Escreva       |
   |-----------------------------|---------------|
   | Nome completo               | `nome`        |
   | CPF                         | `cpf`         |
   | E-mail                      | `email`       |
   | Celular                     | `celular`     |
   | Categoria profissional      | `categoria`   |
   | Instituição ou unidade      | `instituicao` |
   | Pretende submeter trabalho  | `trabalho`    |

5. Clique em **Gerar link** e depois em **Copiar link**.
6. Em `site/js/main.js`, cole o link em `formulario.linkPreenchido`, entre as aspas.
7. Na aba **Respostas** do Google Forms, use **Vincular ao Planilhas** para acompanhar as
   inscrições numa planilha. Compartilhe essa planilha só com a Comissão Organizadora, porque ela
   guarda CPF e contatos dos inscritos.
8. Publique o site e faça uma inscrição de teste. Ela deve aparecer na planilha em poucos
   segundos. Depois apague a linha de teste.

Se o link estiver incompleto, o formulário continua desligado e o console do navegador diz qual
palavra-chave faltou.

### Cuidados

- **Encerrar as inscrições:** mude `formulario.encerrado` para `true` e publique. O formulário
  fecha e os botões passam a dizer "Inscrições encerradas". Não basta desligar "Aceitando
  respostas" no Google: o site continuaria mostrando o formulário e as inscrições se perderiam.
- **Confirmação do envio:** o Google não informa ao site se a resposta foi gravada. O site
  mostra a confirmação quando o envio sai sem erro de rede. Por isso, repita o teste do passo 8
  sempre que mexer no Google Forms.
- **Perguntas recriadas:** se apagar e recriar uma pergunta no Google, ela ganha outro número
  interno. Gere o link pré-preenchido de novo e troque no `main.js`.
- **Modo de teste:** para ver o formulário funcionando sem enviar nada, abra o site com `?teste`
  antes do `#`, por exemplo `https://diid.subhue.org/static-html/congresso-sue/?teste#/inscricoes`.

## Como gerar a versão de arquivo único

```bash
python build.py
```

Gera `dist/index.html` com CSS, JavaScript, logos e edital embutidos.

## Como publicar

### Endereço oficial

O site oficial fica em **<https://diid.subhue.org/static-html/congresso-sue/>**, e é atualizado
a partir deste repositório (<https://github.com/anamazza/Congresso_SUE>). O que vai para o ar é o
conteúdo da pasta `site/` da branch `main`, copiado para esse endereço.

Para atualizar: edite os arquivos em `site/`, faça o commit e envie para a `main`. Depois
atualize a cópia do servidor a partir do repositório. Todos os caminhos do site são relativos, então ele funciona dentro da
subpasta `static-html/congresso-sue/` sem ajuste.

As tags `og:image`, `og:url` e `canonical` em `site/index.html` já apontam para esse endereço.
Se ele mudar, troque as três.

### Cópia no GitHub Pages

O arquivo `.github/workflows/pages.yml` também copia a pasta `site/` para a branch `gh-pages` a
cada envio para a `main`, e o GitHub Pages publica uma cópia em
<https://anamazza.github.io/Congresso_SUE/>. Ela serve para conferir mudanças. Como a tag
`canonical` aponta para o endereço oficial, os buscadores tratam o endereço oficial como o
principal. Para desligar a cópia, apague o workflow ou desative o Pages em **Settings > Pages**.

A pasta `site/` traz também `.nojekyll`, `404.html` (página de erro que leva de volta ao início)
e `robots.txt`, usados pelo GitHub Pages.

### Outras opções

- **Arquivo único**: `dist/index.html`, gerado por `python build.py`, também pode ser enviado à TI.
- **Netlify, Vercel ou similares**: publique a pasta `site/`. Não precisa de build.

### Pendências antes da divulgação

- Ligue o formulário de inscrição ao Google Forms, conforme a seção **Formulário de inscrição**.
- Preencha `submissao.url` em `site/js/main.js` com o link da área do inscrito, onde os
  trabalhos são enviados. Enquanto estiver vazio, o botão mostra "Submissão em breve".
- Confira os textos das páginas **Normas de submissão** e **Privacidade** com a Comissão
  Científica e com o setor responsável pela LGPD. Os dois foram escritos a partir do edital e
  das práticas comuns em eventos de saúde, e trazem marcações "a divulgar" onde faltam decisões.

Fontes (Montserrat e Source Sans 3) são carregadas do Google Fonts. Sem internet, o site cai
para as fontes do sistema sem quebrar o layout.
