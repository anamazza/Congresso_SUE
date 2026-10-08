# Site do 1º Simpósio de Urgência e Emergência

Site institucional do simpósio da Secretaria Municipal de Saúde do Rio de Janeiro (SUBHUE),
3 e 4 de dezembro de 2026, UNIGRANRIO Campus Barra da Tijuca.

As páginas são HTML, CSS e JavaScript puros, sem dependências. Inscrições, envio de trabalhos,
avaliação da comissão e a área da organização usam o servidor do simpósio (pasta `servidor/`),
que roda num contêiner Docker no DIID e guarda os dados num banco próprio.

O site tem menu suspenso no topo (Informações, Programação, Trabalhos) e páginas separadas:
Home, O evento, Programação, Palestrantes, Inscrições, Entrar (área do inscrito, avaliação da
comissão e área da organização), Trabalhos, Enviar trabalho, Normas de submissão,
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
  404.html, robots.txt, .nojekyll
  assets/           capa.jpg (arte colorida do topo da Home), capa-fundo.jpg (fundo das
                    páginas), capa-clara.jpg (versão clara, só serve de origem para o fundo),
                    linha-batimentos.png (traçado de ECG da marca, usado sob a faixa do topo),
                    logo.png (logo compacto colorido), logo-branco.png (logo compacto branco,
                    usado no menu e no rodapé), favicon e edital
gerar_fundo.py      recria capa-fundo.jpg a partir de capa-clara.jpg, sem o logo
servidor/
  src/regras.js     regras do simpósio (inscrição, senhas, trabalhos, comissão, organização)
  src/servidor.js   servidor HTTP: páginas de site/ e a api
  src/repo-sqlite.js  banco SQLite (um arquivo)      src/repo-memoria.js  banco em memória
  src/senhas.js, email.js, config.js, copia.js (cópia de segurança)
  navegador/        gera site/js/banco-teste.js com as mesmas regras
  testes/           npm test
  .env.exemplo      configuração do servidor (copie para .env)
Dockerfile, docker-compose.yml   contêiner do servidor

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
   - `banco.url` fica vazio quando o site é aberto pelo servidor do simpósio, que avisa sozinho
     onde está a `api`. Veja **Inscrições, trabalhos e áreas restritas**.
   - `inscricoes.url` e `submissao.url` só precisam ser preenchidos se as inscrições ou os
     trabalhos passarem a ser recebidos em outro site. Com o servidor ligado, os botões
     "Inscreva-se" e "Submeter trabalho" levam aos formulários do próprio site.
   - `comissao` e `palestrantes` fazem aparecer as seções correspondentes (ocultas enquanto vazias).
2. **Horários da programação**: em `site/index.html`, preencha os `<span class="hora"></span>`
   de cada atividade, por exemplo `<span class="hora">08h30</span>`. Vazio mostra "a confirmar".
3. **Textos das seções**: edite diretamente em `site/index.html`.
4. **Edital final**: substitua `site/assets/Edital.docx` (ou aponte `edital.url` para o PDF).

## Inscrições, trabalhos e áreas restritas

Tudo o que grava dados passa pelo **servidor do simpósio**, na pasta `servidor/`. É um
programa em Node.js que roda num contêiner Docker no DIID, serve as páginas da pasta `site/` e
responde às chamadas do site em `api`, com o banco de dados SQLite num arquivo. Não usa
planilha nem Apps Script.

### Um só "Entrar" para todos

O botão **Entrar**, no topo do site, leva à página `#/area`. Inscritos, avaliadores da Comissão
Científica e organização entram ali com e-mail e senha, e cada um vai direto para a página que
lhe cabe:

| Perfil | Vai para | O que faz ali |
| --- | --- | --- |
| Organização | `#/organizacao` | convida e tira avaliadores, vê inscrições e trabalhos, baixa as listas |
| Comissão Científica | `#/avaliacao` | lê os trabalhos e aprova ou recusa (a recusa exige justificativa) |
| Inscrito | `#/area` (área do inscrito) | vê a inscrição, os trabalhos e o resultado, e envia trabalho |

Depois de entrar, o link do topo vira **Minha área**. Quem tem mais de um perfil (uma
avaliadora que também se inscreveu, por exemplo) vê no alto da página os links para as outras
áreas. Quem tenta abrir uma área que não é sua vê um aviso e o caminho de volta, e o servidor
recusa os pedidos do mesmo jeito, mesmo que alguém tente chamar a API direto.

- **Inscrição**, na página Inscrições. Nela a pessoa cria a senha, e a inscrição já abre a área
  do inscrito.
- **Área do inscrito**: dados da inscrição, trabalhos em que a pessoa é primeiro autor ou
  coautor, com a situação (Em avaliação, Aprovado ou Recusado) e a justificativa da comissão,
  quando houver, e o botão para submeter trabalho. O primeiro autor pode excluir um trabalho
  ("Desistir do trabalho"): ele sai da avaliação e deixa de contar no limite de envios.
- **Envio de trabalhos** (`#/submissao`): só abre para quem entrou e tem inscrição. Quem envia
  é sempre o primeiro autor, identificado pela sessão.
- **Avaliação** (`#/avaliacao`), só para a Comissão Científica: cartões com cada trabalho,
  filtros (A avaliar, Aprovados, Recusados, Todos), busca e o quanto já foi avaliado. O avaliador
  abre o trabalho, lê autores e resumo e clica em **Aprovar** ou **Recusar**. A recusa abre uma
  caixa de justificativa obrigatória. Na mesma hora o primeiro autor recebe o e-mail de
  aprovação, ou o de recusa com a justificativa. Cada trabalho recebe uma só decisão pelo site.
- **Conflito de interesse:** quem está na comissão (mesmo com o convite pendente) ou na
  organização não envia trabalho nem entra como coautor. A organização não consegue convidar
  para a comissão quem é autor ou coautor de um trabalho; o site avisa antes de o convite sair.
- **Área da organização** (`#/organizacao`), só para os e-mails de `ORGANIZACAO_EMAILS`:
  números do evento, aba **Comissão** (convidar, reenviar convite, tirar da comissão), aba
  **Inscrições** (busca e detalhes de contato) e aba **Trabalhos** (filtros, busca e leitura do
  resumo). As duas listas podem ser baixadas em CSV, que abre no Excel.
- **Convite da comissão** (`#/convite/...`): a organização cadastra nome e e-mail do avaliador
  e ele recebe um e-mail com o link. Ao abrir, cria a senha e já cai na avaliação. O avaliador
  não precisa estar inscrito no simpósio. O link vale 7 dias e pode ser reenviado.

A sessão fica só na aba do navegador: ao fechar a aba, a pessoa sai. No servidor, a sessão
vence depois de 6 horas sem uso. Isso protege quem usa computador compartilhado na unidade.
Esqueceu a senha? Em Entrar, "Esqueci a senha" manda um código de 6 números para o e-mail.

### O que o servidor garante

- gera o número de inscrição (INS-0001) e o protocolo do trabalho (TRB-0001);
- recusa CPF já inscrito e e-mail já usado, porque o e-mail é o login;
- guarda as senhas só em versão embaralhada (scrypt, com sal próprio). Ninguém, nem a
  organização, consegue ler a senha no banco;
- depois de 5 senhas erradas seguidas, faz o e-mail esperar 15 minutos; manda no máximo 3
  códigos por hora para o mesmo e-mail, e cada código vale 30 minutos e aceita 5 tentativas;
- comissão e organização só entram com o e-mail comprovado (pelo convite ou por código). A
  senha criada numa inscrição não dá acesso a essas áreas;
- quem sai da comissão perde o acesso na hora, mesmo com a sessão aberta;
- só aceita trabalho de quem entrou e tem inscrição, e exige apresentador inscrito;
- no envio de trabalho, preenche nome e instituição dos coautores inscritos, só quando o CPF e
  o e-mail do coautor batem com a mesma inscrição;
- aplica as regras do edital: até 3 trabalhos como primeiro autor, até 8 autores, 2.500
  caracteres sem espaços no resumo, até 200 caracteres no título, celular com DDD e 9 inicial,
  e os prazos no horário de Brasília;
- manda os e-mails (confirmação, código, convite e resultado) e anota se cada um saiu.

Sem o servidor (por exemplo, abrindo `site/index.html` direto do computador), os formulários e
o Entrar aparecem desligados e com aviso, para ninguém achar que se inscreveu.

## Servidor no DIID (Docker)

O que a equipe de TI precisa: Docker com Docker Compose, o endereço público com HTTPS (o proxy
do DIID), um servidor de e-mail SMTP para os envios e espaço para o volume de dados.

### Instalar

1. Baixe o repositório no servidor: `git clone https://github.com/anamazza/Congresso_SUE.git`
2. Copie `servidor/.env.exemplo` para `servidor/.env` e preencha. O mínimo é:
   - `URL_SITE`: o endereço público, com a barra no final
     (`https://diid.subhue.org/static-html/congresso-sue/`). Vai nos links dos e-mails;
   - `ORGANIZACAO_EMAILS`: os e-mails da organização, separados por vírgula;
   - `SMTP_HOST`, `SMTP_PORTA`, `SMTP_USUARIO`, `SMTP_SENHA` e `EMAIL_REMETENTE`.
3. Suba o contêiner: `docker compose up -d --build`. Ele escuta na porta 8080.
4. Aponte o proxy do DIID para o contêiner. No nginx, por exemplo:

   ```nginx
   location /static-html/congresso-sue/ {
       proxy_pass http://127.0.0.1:8080/;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-Proto $scheme;
       client_max_body_size 1m;
   }
   ```

   Com a barra no fim do `proxy_pass`, o nginx tira o prefixo e `CAMINHO_BASE` fica vazio. Se o
   proxy repassar o caminho inteiro, preencha `CAMINHO_BASE=/static-html/congresso-sue`.
5. Confira: `https://diid.subhue.org/static-html/congresso-sue/api` deve mostrar
   `{"ok":true,"mensagem":"Servidor do ... no ar."}`.

O `.env` tem a senha do SMTP: não publique esse arquivo (ele já está no `.gitignore`).

Antes de ligar o SMTP, dá para conferir tudo com `EMAIL_MODO=arquivo`: os e-mails não saem e
ficam registrados em `/dados/emails.log` (`docker compose exec simposio cat /dados/emails.log`).

### Primeiro acesso da organização e convites

1. Em **Entrar**, a pessoa da organização clica em "Esqueci a senha", informa o e-mail que está
   em `ORGANIZACAO_EMAILS`, recebe o código e cria a senha. Já cai na área da organização.
2. Na aba **Comissão**, cadastra nome e e-mail de cada avaliador e clica em **Enviar convite**.
   O avaliador aparece como "Convite pendente" até criar a senha, e depois como "Ativo".
3. Para tirar alguém da comissão, use **Tirar da comissão**. As decisões já registradas
   continuam valendo.

Para mudar quem é da organização, altere `ORGANIZACAO_EMAILS` no `.env` e rode
`docker compose up -d` de novo.

### Atualizar o site

```bash
git pull
docker compose up -d --build
```

Os dados ficam no volume `simposio-ue-dados` e não se perdem ao atualizar.

### Cópia de segurança

O banco inteiro é um arquivo SQLite no volume. Para fazer uma cópia com o site no ar:

```bash
docker compose exec simposio node src/copia.js
docker compose cp simposio:/dados/copias/ ./copias-simposio/
```

A cópia leva a data e a hora no nome (`simposio-20261008-1230.db`). Para restaurar, pare o
contêiner, coloque a cópia no volume com o nome `simposio.db` e suba de novo. Vale agendar uma
cópia diária no servidor durante as inscrições.

### Variáveis do `.env`

Todas estão explicadas em `servidor/.env.exemplo`. Além das do item **Instalar**:

- `INSCRICOES_INICIO`, `INSCRICOES_FIM`, `SUBMISSAO_INICIO`, `SUBMISSAO_FIM` (AAAA-MM-DD) e
  `RESULTADO`: os prazos que o servidor aplica. Vazios, valem os do edital, que já estão no
  programa. Se mudar um prazo, mude também a data correspondente no `CONFIG` de
  `site/js/main.js`, que é o que o site mostra e usa para fechar os formulários;
- `VAGAS`: número máximo de inscrições (vazio = sem limite automático);
- `TESTE=true` num servidor de homologação: os e-mails saem com [TESTE] no assunto;
- `ORIGENS_PERMITIDAS`: só se as páginas ficarem num endereço e o servidor em outro. Nesse
  caso, preencha também `banco.url` em `site/js/main.js` com o endereço completo da `api`.

### Testes do servidor

```bash
cd servidor
npm ci
npm test
```

Os testes conferem as regras do edital (com o banco em memória e com o SQLite), o servidor HTTP
de verdade e se o banco de teste do navegador está em dia. Eles também rodam no GitHub a cada
envio (`.github/workflows/testes.yml`).

### Ambiente de teste

O ambiente de teste deixa a equipe usar o site de ponta a ponta (inscrição, área do inscrito,
envio de trabalho, área da organização, convite, avaliação e resultado) sem servidor e sem
mexer em dado nenhum de verdade.

- Quem entra pelo endereço normal vê o site como está, ligado ao servidor.
- Quem abre com `?teste` no endereço, ou pela cópia do GitHub Pages, usa um banco que roda no
  próprio navegador (`site/js/banco-teste.js`) com as mesmas regras do servidor. Os dados ficam
  só naquele navegador e nada sai do computador.

No canto da tela aparece o **Painel de teste**, com:

- **E-mails enviados:** confirmações, códigos, convites e resultados, com [TESTE] no assunto e
  os links clicáveis (o link do convite abre a página de criar a senha do avaliador);
- **Acessos de teste:** como entrar com cada perfil;
- **Dados:** inscrições, trabalhos e contas gravados no navegador;
- **Apagar todos os dados de teste:** recomeça do zero naquele navegador.

Para testar a organização, use `organizacao@teste.com`: em Entrar, "Esqueci a senha", e o código
aparece no Painel de teste. De lá, convide um avaliador; o convite aparece em E-mails enviados.
Inscritos de teste são criados pelo próprio formulário de inscrição.

Cada navegador tem o seu banco: uma pessoa não vê os dados de teste da outra. Use CPFs de
exemplo, como 529.982.247-25, 111.444.777-35 e 935.411.347-80, e nunca dados reais.

`site/js/banco-teste.js` é gerado a partir de `servidor/src/regras.js`,
`servidor/src/repo-memoria.js` e `servidor/navegador/molde.js`. Depois de mudar algum deles,
rode `node servidor/navegador/gerar.js`. O `npm test` avisa quando o arquivo ficou para trás.

### API do servidor

Para quem for integrar ou manter: o site chama `api` com `POST`, corpo em JSON e
`Content-Type: text/plain`, no formato `{"acao": "...", "dados": {...}}`. As respostas são JSON
com `"ok": true` ou `"ok": false` e uma `mensagem` para a pessoa (às vezes com `campo`, que o
site usa para marcar o campo com erro).

- **Públicas:** `inscricao`, `entrar`, `pedirCodigo`, `novaSenha`, `convite` (confere o link) e
  `aceitarConvite`. As que abrem sessão devolvem `token`, `nome` e `papeis`
  (`organizacao`, `comissao`, `inscrito`).
- **Com sessão (`token`):** `sessao`, `sair`, `painel`, `trabalho` e `conferir` (coautor).
- **Comissão:** `comissaoTrabalhos` e `comissaoDecidir` (`protocolo`, `decisao`: `"aprovado"` ou
  `"recusado"`, `comentario`; na recusa, o comentário é a justificativa obrigatória).
- **Inscrito:** `excluirTrabalho` (`protocolo`), só para o primeiro autor.
- **Organização:** `orgPainel`, `orgConvidar` (`nome`, `email`), `orgReenviarConvite` e
  `orgRemoverComissao` (`email`).

Sessão vencida responde com `"erro": "sessao"`, e perfil sem permissão com
`"erro": "sem_acesso"`. As regras estão todas em `servidor/src/regras.js`.

## Como gerar a versão de arquivo único

```bash
python build.py
```

Gera `dist/index.html` com CSS, JavaScript, logos e edital embutidos.

## Como publicar

### Endereço oficial

O site oficial fica em **<https://diid.subhue.org/static-html/congresso-sue/>**, servido pelo
contêiner do simpósio (seção **Servidor no DIID**), a partir deste repositório
(<https://github.com/anamazza/Congresso_SUE>), branch `main`.

Para atualizar: edite os arquivos, faça o commit e envie para a `main`. Depois, no servidor,
rode `git pull` e `docker compose up -d --build`. Todos os caminhos do site são relativos, então
ele funciona dentro da subpasta `static-html/congresso-sue/` sem ajuste.

As tags `og:image`, `og:url` e `canonical` em `site/index.html` já apontam para esse endereço.
Se ele mudar, troque as três.

### Cópia no GitHub Pages

O arquivo `.github/workflows/pages.yml` também copia a pasta `site/` para a branch `gh-pages` a
cada envio para a `main`, e o GitHub Pages publica uma cópia em
<https://anamazza.github.io/Congresso_SUE/>. Ela serve para testes: em qualquer endereço
`*.github.io` o site abre sempre no modo de teste, como se tivesse `?teste`, com o banco no
navegador e o Painel de teste. Ela não tem servidor e não recebe dados de ninguém. O endereço oficial continua precisando do `?teste`. Como a tag
`canonical` aponta para o endereço oficial, os buscadores tratam o endereço oficial como o
principal. Para desligar a cópia, apague o workflow ou desative o Pages em **Settings > Pages**.

A cópia só fica no ar com o Pages ligado, e no plano gratuito do GitHub isso exige o
repositório público. Em **Settings > Pages > Build and deployment > Source: Deploy from a
branch** há duas formas:

- **Branch `gh-pages`, pasta `/ (root)`** (como está hoje): o Pages publica só a pasta `site/`,
  copiada pelo workflow, e o site fica direto em <https://anamazza.github.io/Congresso_SUE/>.
- **Branch `main`, pasta `/ (root)`**: o Pages publica o repositório inteiro, inclusive este
  README, e o site fica em <https://anamazza.github.io/Congresso_SUE/site/>. O `index.html` da
  raiz leva quem abre o endereço curto para lá. Prefira a `gh-pages`.

Nas duas, a cópia se atualiza sozinha a cada envio para a `main`.

A pasta `site/` traz também `.nojekyll`, `404.html` (página de erro que leva de volta ao início)
e `robots.txt`, usados pelo GitHub Pages.

### Outras opções

- **Arquivo único**: `dist/index.html`, gerado por `python build.py`, serve para mostrar o site
  ou testar no modo de teste. Os formulários de verdade precisam do servidor.

### Pendências antes da divulgação

- Instale o servidor no DIID, ligue o SMTP e preencha `ORGANIZACAO_EMAILS`, conforme a seção
  **Servidor no DIID (Docker)**. Depois, a organização convida a Comissão Científica pelo site.
- Confira os textos das páginas **Normas de submissão** e **Privacidade** com a Comissão
  Científica e com o setor responsável pela LGPD. Os dois foram escritos a partir do edital e
  das práticas comuns em eventos de saúde, e trazem marcações "a divulgar" onde faltam decisões.

Fontes (Montserrat e Source Sans 3) são carregadas do Google Fonts. Sem internet, o site cai
para as fontes do sistema sem quebrar o layout.
