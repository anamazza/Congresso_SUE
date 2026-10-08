# Site do 1º Simpósio de Urgência e Emergência

Site institucional do simpósio da Secretaria Municipal de Saúde do Rio de Janeiro (SUBHUE),
3 e 4 de dezembro de 2026, UNIGRANRIO Campus Barra da Tijuca.

Feito em HTML, CSS e JavaScript puros, sem dependências. Funciona em qualquer hospedagem
de arquivos estáticos e também como um único arquivo HTML.

O site tem menu suspenso no topo (Informações, Programação, Trabalhos) e páginas separadas:
Home, O evento, Programação, Palestrantes, Inscrições, Área do inscrito, Trabalhos, Enviar trabalho, Normas de submissão,
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
  js/banco-teste.js banco de teste que roda no navegador com ?teste (arquivo gerado)
  assets/           capa.jpg (arte colorida do topo da Home), capa-fundo.jpg (fundo das
                    páginas), capa-clara.jpg (versão clara, só serve de origem para o fundo),
                    linha-batimentos.png (traçado de ECG da marca, usado sob a faixa do topo),
                    logo.png (logo compacto colorido), logo-branco.png (logo compacto branco,
                    usado no menu e no rodapé), favicon e edital
gerar_fundo.py      recria capa-fundo.jpg a partir de capa-clara.jpg, sem o logo
banco/
  apps-script.gs    banco dos formulários (Apps Script ligado a uma planilha Google)
  testar-banco.js   testes do banco num simulador: node banco/testar-banco.js
  banco-teste-molde.js  molde do banco de teste no navegador
  gerar-banco-teste.js  junta o molde e apps-script.gs em site/js/banco-teste.js

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
   - `banco.url` liga os formulários de inscrição e de envio de trabalhos. Veja a seção
     **Formulários e banco de dados**.
   - `inscricoes.url` e `submissao.url` só precisam ser preenchidos se as inscrições ou os
     trabalhos passarem a ser recebidos em outro site. Com o banco ligado, os botões
     "Inscreva-se" e "Submeter trabalho" levam aos formulários do próprio site.
   - `comissao` e `palestrantes` fazem aparecer as seções correspondentes (ocultas enquanto vazias).
2. **Horários da programação**: em `site/index.html`, preencha os `<span class="hora"></span>`
   de cada atividade, por exemplo `<span class="hora">08h30</span>`. Vazio mostra "a confirmar".
3. **Textos das seções**: edite diretamente em `site/index.html`.
4. **Edital final**: substitua `site/assets/Edital.docx` (ou aponte `edital.url` para o PDF).

## Formulários e banco de dados

O site tem formulários com a identidade visual do evento:

- **Inscrição**, na página Inscrições. Nela a pessoa cria uma senha, e a inscrição já abre a
  área do inscrito.
- **Área do inscrito** (`#/area`), a "área do inscrito" citada no edital. A pessoa entra com
  o e-mail da inscrição e a senha, vê os dados da inscrição e os trabalhos em que é primeiro
  autor ou coautor, e tem o botão para submeter trabalho. Quem esqueceu a senha, ou se
  inscreveu antes de existir a senha, recebe um código de 6 números no e-mail da inscrição e
  cria uma senha nova.
- **Envio de trabalhos**, na página Enviar trabalho. Só abre para quem entrou na área do
  inscrito; quem envia é sempre o primeiro autor, identificado pela sessão. Sem entrar, a
  página mostra o convite para entrar ou se inscrever.

A sessão fica só na aba do navegador: ao fechar a aba, a pessoa sai. No banco, a sessão vence
depois de 6 horas sem uso. Isso protege quem usa computador compartilhado na unidade.

Como o site não tem servidor, os formulários enviam os dados para um banco: uma planilha do
Google com um programa em Apps Script, guardado em `banco/apps-script.gs`. O banco faz o
seguinte:

- grava cada inscrição na aba Inscrições e cada trabalho na aba Trabalhos;
- gera o número de inscrição, como INS-0001, e o protocolo do trabalho, como TRB-0001;
- recusa CPF que já está inscrito e e-mail que já está em outra inscrição, porque o e-mail é o
  login da área do inscrito;
- guarda a senha na aba Acessos só em versão embaralhada (500 rodadas de HMAC-SHA-256 com sal
  próprio e um segredo guardado fora da planilha). Ninguém consegue ler a senha na planilha;
- abre a sessão, mostra o painel, manda o código para criar ou trocar a senha e encerra a sessão;
- depois de 5 senhas erradas seguidas, faz o e-mail esperar 15 minutos; manda no máximo 3
  códigos por hora para o mesmo e-mail, e cada código vale 30 minutos e aceita 5 tentativas;
- só aceita trabalho de quem entrou na área do inscrito, e exige apresentador inscrito;
- no envio de trabalho, preenche nome e instituição dos coautores inscritos. Só responde a quem
  entrou e só quando o CPF e o e-mail do coautor batem com a mesma inscrição;
- exige celular com DDD e o 9 inicial;
- aplica as regras do edital: até 3 trabalhos como primeiro autor, até 8 autores, 2.500
  caracteres sem espaços no resumo, até 200 caracteres no título e prazo até 06/11, no horário de Brasília;
- manda e-mail de confirmação e anota na planilha se ele saiu.

Enquanto `banco.url` estiver vazio em `site/js/main.js`, os formulários e a área do inscrito
aparecem desligados e com um aviso, para ninguém achar que se inscreveu ou enviou trabalho.

### Como instalar o banco

1. Numa conta Google institucional, crie uma planilha nova, por exemplo "Simpósio UE 2026 · Banco".
2. Na planilha, abra **Extensões > Apps Script**. Apague o código que aparece, cole todo o
   conteúdo de `banco/apps-script.gs` e salve.
3. Confira o bloco `CONFIG` no começo do código: datas, vagas e `EMAIL_RESPOSTA`, o e-mail da
   organização que recebe as respostas dos participantes.
4. No alto do editor, escolha a função `configurar` e clique em **Executar**. O Google pede
   autorização: aceite com a conta dona da planilha. As abas Inscrições e Trabalhos são criadas.
5. Clique em **Implantar > Nova implantação**. Em tipo, escolha **App da Web**. Em "Executar
   como", escolha **Eu**. Em "Quem pode acessar", escolha **Qualquer pessoa**. Clique em
   **Implantar** e copie o URL do app da Web, que termina em `/exec`.
6. Em `site/js/main.js`, cole esse endereço em `banco.url`, entre as aspas, e publique o site.
7. Faça uma inscrição de teste e depois envie um trabalho de teste com o mesmo CPF e e-mail.
   Confira as linhas na planilha e os e-mails recebidos. Depois apague as linhas de teste.

Abrir o endereço `/exec` no navegador mostra a mensagem "Banco ... no ar", útil para conferir
se a implantação funcionou.

### Depois de instalado

- **Mudanças no código do banco:** só valem depois de **Implantar > Gerenciar implantações**,
  lápis, **Versão: Nova versão** e **Implantar**. O endereço continua o mesmo.
- **Encerramento das inscrições:** o formulário fecha sozinho depois de `inscricoes.fim`, no
  site, e o banco recusa depois de `INSCRICOES_FIM`, no Apps Script. Hoje os dois estão em
  30/11/2026. Para fechar antes, por exemplo quando as vagas acabarem, mude
  `banco.inscricoesEncerradas` para `true` no site e preencha `VAGAS` ou `INSCRICOES_FIM` no banco.
- **Prazo dos trabalhos:** o envio fecha sozinho depois de `submissao.prazo`, no site, e de
  `SUBMISSAO_FIM`, no banco. Se o prazo mudar, altere os dois.
- **Avaliação:** a aba Trabalhos tem a coluna Avaliação, livre para a Comissão Científica.
- **Limite de e-mails:** o Google limita os e-mails enviados por dia, cerca de 100 numa conta
  Gmail comum e 1.500 numa conta Workspace. Quando o limite acaba, o registro é gravado mesmo
  assim e a coluna "E-mail de confirmação" mostra que o e-mail não saiu.
- **Privacidade:** a planilha guarda CPF, e-mail e celular. Compartilhe só com a Comissão
  Organizadora. A aba Acessos pode ficar oculta; ela não tem as senhas, só a versão embaralhada.
- **Segredo das senhas:** `configurar` cria a propriedade `SEGREDO_SENHAS` em **Configurações
  do projeto > Propriedades do script**. Não apague nem mude: sem ela, nenhuma senha confere, e
  cada pessoa precisaria criar outra pelo "Esqueci a senha".
- **Atualizar um banco já instalado:** depois de colar o código novo, rode `configurar` de novo
  (cria a aba Acessos e o segredo, sem apagar nada) e publique uma nova versão. Quem já estava
  inscrito sem senha cria a sua pelo "Esqueci a senha".
- **Modo de teste:** abra o site com `?teste` antes do `#`, por exemplo
  `https://diid.subhue.org/static-html/congresso-sue/?teste#/submissao`. Os formulários e a
  área do inscrito aparecem liberados, com uma faixa avisando que é teste, e usam um banco que
  roda no próprio navegador. Veja **Ambiente de teste**, abaixo.
- **Testes do banco:** `node banco/testar-banco.js` roda o código do Apps Script num simulador
  e confere as regras do edital. Rode sempre que mudar o código do banco.

### Ambiente de teste

O ambiente de teste deixa a equipe usar o site de ponta a ponta (inscrição, senha, área do
inscrito, envio de trabalho, recuperação de senha) sem mudar nada do que o público vê e sem
precisar de planilha nem de Apps Script.

- Quem entra pelo endereço normal continua vendo o site como está, e os envios vão apenas
  para `banco.url`.
- Quem abre com `?teste` no endereço vê os formulários liberados, com aviso de teste, mesmo
  antes da abertura ou depois do prazo no site. O banco segue as datas do `CONFIG` dele.

**Banco de teste no navegador (padrão).** Com `banco.urlTeste` vazio, o `?teste` carrega
`site/js/banco-teste.js`, que roda o mesmo código de `banco/apps-script.gs` dentro do
navegador. A planilha, as senhas e os e-mails ficam guardados só naquele navegador e nada sai
do computador. No canto da tela aparece o **Painel de teste**, com:

- **E-mails enviados:** as confirmações e os códigos de "Esqueci a senha", com [TESTE] no assunto;
- **Planilha:** as abas Inscrições, Trabalhos e Acessos, como a organização veria;
- **Apagar todos os dados de teste:** recomeça do zero naquele navegador.

Cada navegador tem o seu banco: uma pessoa não vê as inscrições de teste da outra. Para testar
a busca de coautor inscrito, inscreva o coautor no mesmo navegador antes.

Links para testar, no site oficial ou na cópia do GitHub Pages:
`.../?teste#/inscricoes/formulario`, `.../?teste#/area` e `.../?teste#/submissao`.

`site/js/banco-teste.js` é gerado. Depois de mudar `banco/apps-script.gs` ou
`banco/banco-teste-molde.js`, rode `node banco/gerar-banco-teste.js`. O
`node banco/testar-banco.js` avisa quando o arquivo gerado ficou para trás.

**Planilha de testes do Google (opcional).** Para testar com o Google de verdade, com e-mails
chegando na caixa de entrada:

1. Crie uma planilha separada, por exemplo "Simpósio UE 2026 · Banco de TESTE". Não use a
   planilha oficial.
2. Repita os passos 2 a 5 de **Como instalar o banco** nessa planilha. Antes de executar
   `configurar`, mude `TESTE: false` para `TESTE: true` no código colado. Com isso, os e-mails
   saem com `[TESTE]` no assunto e um aviso de que nada foi registrado de verdade.
3. Cole o endereço `/exec` dessa implantação em `banco.urlTeste`, em `site/js/main.js`, e
   publique o site. Para voltar ao banco do navegador, deixe `banco.urlTeste` vazio.

Dicas para os testes:

- Use os CPFs de exemplo dos testes do banco, como 529.982.247-25, 111.444.777-35 e
  935.411.347-80. Não use dados reais de ninguém.
- Na planilha do Google, para testar o fim de um prazo ou o limite de vagas, mude as datas ou
  `VAGAS` no `CONFIG` da planilha de testes e publique uma nova versão dela.

O endereço com `?teste` não é secreto: ele aparece neste README. Com o banco do navegador,
quem o descobrir só mexe nos próprios dados, no próprio navegador.

### Usar outro banco de dados

Se a equipe de TI preferir gravar num banco de dados próprio, basta um endereço `https` que
siga o mesmo formato e colocá-lo em `banco.url`. O código em `banco/apps-script.gs` serve de
referência para as regras.

- **Pedido:** `POST` com o corpo em JSON e `Content-Type: text/plain`, no formato
  `{"acao": "...", "dados": {...}}`. As ações são `inscricao`, `entrar`, `painel`,
  `trabalho`, `conferir`, `pedirCodigo`, `novaSenha` e `sair`.
- **Dados da inscrição:** `nome`, `cpf`, `email`, `celular`, `categoria`, `instituicao`,
  `trabalho` (pode vir vazio) e `senha`. A resposta traz `protocolo`, `nome` e `token`.
- **Sessão:** `entrar` (`email`, `senha`) e `novaSenha` (`email`, `codigo`, `senha`) devolvem
  `token`. `painel`, `trabalho`, `conferir` e `sair` recebem esse `token`. Sessão vencida ou
  inexistente responde com `"erro": "sessao"`, e o site volta para a tela de entrar.
- **Painel:** `{"ok": true, "inscricao": {...}, "trabalhos": [...], "submissao": {"aberta",
  "prazo", "maximo", "restantes"}}`.
- **Dados do trabalho:** `token`, `titulo`, `tipo`, `eixo`, `coautores` (lista de
  `{"nome", "cpf", "email", "instituicao"}`, com instituição opcional), `apresentador`
  (`"primeiro"` ou `"coautor"`), `apresentadorCpf` (CPF do coautor que apresenta),
  `introducao`, `metodos`, `resultados` e `conclusoes`. O primeiro autor é quem está na sessão.
- **Resposta de sucesso:** `{"ok": true, "protocolo": "INS-0001"}`. Para `conferir` (`token`,
  `cpf` e `email` do coautor), `{"ok": true, "nome": "...", "instituicao": "..."}`, só quando
  CPF e e-mail são da mesma inscrição. `conferir` não grava nada. `pedirCodigo` responde igual
  com ou sem inscrição, para não revelar quem está inscrito.
- **Resposta de recusa:** `{"ok": false, "mensagem": "texto para a pessoa", "campo": "cpf"}`.
  O campo é opcional: quando vem, o site mostra a mensagem embaixo dele.
- **Outro domínio:** se o banco ficar fora de `diid.subhue.org`, ele precisa responder com
  `Access-Control-Allow-Origin` liberando o endereço do site.

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
<https://anamazza.github.io/Congresso_SUE/>. Ela serve para testes: em qualquer endereço
`*.github.io` o site abre sempre no modo de teste, como se tivesse `?teste`, com o banco no
navegador e o Painel de teste. O endereço oficial continua precisando do `?teste`. Como a tag
`canonical` aponta para o endereço oficial, os buscadores tratam o endereço oficial como o
principal. Para desligar a cópia, apague o workflow ou desative o Pages em **Settings > Pages**.

A cópia só fica no ar com o Pages ligado, e no plano gratuito do GitHub isso exige o
repositório público. Em **Settings > Pages > Build and deployment > Source: Deploy from a
branch** há duas formas:

- **Branch `main`, pasta `/ (root)`** (como está hoje): o Pages publica o repositório inteiro e
  o site fica em <https://anamazza.github.io/Congresso_SUE/site/>. O `index.html` da raiz do
  repositório leva quem abre o endereço curto para lá, mantendo `?teste` e `#/pagina`.
- **Branch `gh-pages`, pasta `/ (root)`**: o Pages publica só a pasta `site/`, copiada pelo
  workflow, e o site fica direto em <https://anamazza.github.io/Congresso_SUE/>.

Nas duas, a cópia se atualiza sozinha a cada envio para a `main`.

A pasta `site/` traz também `.nojekyll`, `404.html` (página de erro que leva de volta ao início)
e `robots.txt`, usados pelo GitHub Pages.

### Outras opções

- **Arquivo único**: `dist/index.html`, gerado por `python build.py`, também pode ser enviado à TI.
- **Netlify, Vercel ou similares**: publique a pasta `site/`. Não precisa de build.

### Pendências antes da divulgação

- Instale o banco e preencha `banco.url`, conforme a seção **Formulários e banco de dados**.
- Confira os textos das páginas **Normas de submissão** e **Privacidade** com a Comissão
  Científica e com o setor responsável pela LGPD. Os dois foram escritos a partir do edital e
  das práticas comuns em eventos de saúde, e trazem marcações "a divulgar" onde faltam decisões.

Fontes (Montserrat e Source Sans 3) são carregadas do Google Fonts. Sem internet, o site cai
para as fontes do sistema sem quebrar o layout.
