/* =====================================================================
   1º Simpósio de Urgência e Emergência · servidor
   ---------------------------------------------------------------------
   Um programa só, sem outros serviços: serve as páginas da pasta site/ e
   responde em /api às chamadas do site (inscrição, área do inscrito,
   comissão e organização), com o banco SQLite num arquivo.

   Uso:  node servidor/src/servidor.js   (ou pelo Docker; ver README)
   ===================================================================== */
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { lerConfig } = require("./config.js");
const regras = require("./regras.js");
const { criarRepoSqlite } = require("./repo-sqlite.js");
const senhas = require("./senhas.js");
const { criarEmail } = require("./email.js");

const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".pdf": "application/pdf",
};
const LIMITE_CORPO = 256 * 1024; // um trabalho completo tem bem menos que isso
const LIMITE_DESCARTE = 4 * 1024 * 1024; // acima disso, corta a conexão sem responder

// Diz ao site, servido daqui, que o banco está em "api" (mesmo endereço)
const LIGACAO_DO_BANCO = '<script>window.SIMPOSIO_BANCO = "api";</script>\n';

function lerCorpo(req) {
  return new Promise(function (ok, falhou) {
    let tamanho = 0;
    const partes = [];
    req.on("data", function (parte) {
      tamanho += parte.length;
      // Passou do limite: lê o resto sem guardar, para conseguir responder 413
      if (tamanho <= LIMITE_CORPO) partes.push(parte);
      else if (tamanho > LIMITE_DESCARTE) req.destroy();
    });
    req.on("end", function () {
      if (tamanho > LIMITE_CORPO) falhou(Object.assign(new Error("pedido grande demais"), { status: 413 }));
      else ok(Buffer.concat(partes).toString("utf8"));
    });
    req.on("error", falhou);
  });
}

function criarServidor(opcoes) {
  const config = opcoes.config;
  let repo = opcoes.repo;
  if (!repo) {
    fs.mkdirSync(path.dirname(path.resolve(config.arquivoBanco)), { recursive: true });
    repo = criarRepoSqlite({ arquivo: config.arquivoBanco });
  }
  const registrar = opcoes.log || function (erro) { console.error(new Date().toISOString(), erro); };
  const banco = regras.criarBanco({
    repo: repo,
    senhas: senhas,
    aleatorio: senhas.aleatorio,
    resumo: senhas.resumo,
    email: opcoes.email || criarEmail(config.email),
    config: config.regras,
    log: registrar,
  });
  const pasta = path.resolve(config.pastaSite);

  function responderJson(res, status, objeto) {
    const corpo = JSON.stringify(objeto);
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(corpo);
  }

  async function api(req, res) {
    const origem = req.headers.origin;
    if (origem && config.origensPermitidas.indexOf(origem.toLowerCase()) >= 0) {
      res.setHeader("Access-Control-Allow-Origin", origem);
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "Access-Control-Allow-Methods": "POST, GET", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600" });
      return res.end();
    }
    if (req.method === "GET") return responderJson(res, 200, { ok: true, mensagem: "Servidor do " + banco.config.EVENTO + " no ar." });
    if (req.method !== "POST") return responderJson(res, 405, { ok: false, mensagem: "Use POST." });

    let pedido;
    try {
      pedido = JSON.parse(await lerCorpo(req));
    } catch (erro) {
      if (erro && erro.status === 413) return responderJson(res, 413, { ok: false, erro: "grande_demais", mensagem: "Os dados enviados passaram do tamanho permitido." });
      return responderJson(res, 400, { ok: false, erro: "pedido_invalido", mensagem: "Não foi possível ler os dados enviados." });
    }
    if (!pedido || typeof pedido !== "object") {
      return responderJson(res, 400, { ok: false, erro: "pedido_invalido", mensagem: "Não foi possível ler os dados enviados." });
    }
    responderJson(res, 200, await banco.tratar(pedido.acao, pedido.dados));
  }

  function arquivo(req, res, caminho) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "Allow": "GET, HEAD" });
      return res.end();
    }
    let relativo;
    try {
      relativo = decodeURIComponent(caminho);
    } catch (erro) {
      relativo = "/";
    }
    if (relativo.endsWith("/")) relativo += "index.html";
    const alvo = path.resolve(pasta, "." + relativo);
    // Nunca sai da pasta do site
    if (alvo !== pasta && !alvo.startsWith(pasta + path.sep)) return naoEncontrado(res);
    fs.stat(alvo, function (erro, info) {
      if (erro || !info.isFile()) return naoEncontrado(res);
      const tipo = TIPOS[path.extname(alvo).toLowerCase()] || "application/octet-stream";
      const html = tipo.startsWith("text/html");
      const cabecalhos = { "Content-Type": tipo, "Cache-Control": html || tipo.includes("javascript") || tipo.includes("css") ? "no-cache" : "public, max-age=86400" };
      if (html && path.basename(alvo) === "index.html") {
        const pagina = fs.readFileSync(alvo, "utf8").replace('<script src="js/main.js">', LIGACAO_DO_BANCO + '<script src="js/main.js">');
        res.writeHead(200, cabecalhos);
        return res.end(req.method === "HEAD" ? undefined : pagina);
      }
      cabecalhos["Content-Length"] = info.size;
      res.writeHead(200, cabecalhos);
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(alvo).pipe(res);
    });
  }

  function naoEncontrado(res) {
    const pagina404 = path.join(pasta, "404.html");
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.existsSync(pagina404) ? fs.readFileSync(pagina404) : "Página não encontrada");
  }

  const servidor = http.createServer(function (req, res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    const endereco = new URL(req.url, "http://servidor");
    let caminho = endereco.pathname;
    if (config.caminhoBase && caminho === config.caminhoBase) {
      // Sem a barra final, os endereços relativos do site (css/, js/, api) quebram
      res.writeHead(301, { "Location": config.caminhoBase + "/" + endereco.search });
      return res.end();
    }
    if (config.caminhoBase && caminho.startsWith(config.caminhoBase + "/")) {
      caminho = caminho.slice(config.caminhoBase.length);
    }
    if (caminho === "/api" || caminho === "/api/") {
      return api(req, res).catch(function (erro) {
        registrar(erro);
        if (!res.headersSent) responderJson(res, 500, { ok: false, erro: "erro_interno", mensagem: "Não foi possível concluir agora." });
      });
    }
    arquivo(req, res, caminho);
  });
  servidor.on("close", function () { if (repo.fechar) repo.fechar(); });
  return servidor;
}

module.exports = { criarServidor: criarServidor };

if (require.main === module) {
  const config = lerConfig(process.env);
  const servidor = criarServidor({ config: config });
  servidor.listen(config.porta, function () {
    console.log("Servidor do simpósio na porta " + config.porta + ". Banco: " + config.arquivoBanco +
      ". E-mail: " + config.email.modo + (config.regras.TESTE ? ". MODO DE TESTE." : "."));
    if (!config.regras.ORGANIZACAO || !config.regras.ORGANIZACAO.length) {
      console.log("Atenção: ORGANIZACAO_EMAILS está vazio; ninguém entra na área da organização.");
    }
  });
  const encerrar = function () { servidor.close(function () { process.exit(0); }); };
  process.on("SIGTERM", encerrar);
  process.on("SIGINT", encerrar);
}
