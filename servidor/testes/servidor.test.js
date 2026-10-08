/* =====================================================================
   Testes do servidor HTTP (servidor/src/servidor.js): sobe o servidor de
   verdade numa porta livre, com banco SQLite e e-mails gravados em
   arquivo numa pasta temporária, e confere o que o navegador recebe.

   Uso:  node servidor/testes/servidor.test.js
   ===================================================================== */
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { lerConfig } = require("../src/config.js");
const { criarServidor } = require("../src/servidor.js");
const { fazerCopia } = require("../src/copia.js");
const { DatabaseSync } = require("node:sqlite");

const resultados = [];
const ok = function (cond, msg) { resultados.push([!!cond, msg]); };

function subir(pasta, extra) {
  const config = lerConfig(Object.assign({
    PASTA_DADOS: pasta,
    EMAIL_MODO: "arquivo",
    ORGANIZACAO_EMAILS: "org@exemplo.com",
    URL_SITE: "https://diid.exemplo.org/congresso-sue/",
    INSCRICOES_INICIO: "2026-01-01",
    SUBMISSAO_INICIO: "2026-01-01",
  }, extra));
  const servidor = criarServidor({ config: config, log: function () {} });
  return new Promise(function (pronto) {
    servidor.listen(0, "127.0.0.1", function () {
      pronto({ servidor: servidor, config: config, base: "http://127.0.0.1:" + servidor.address().port });
    });
  });
}

function fechar(s) {
  return new Promise(function (pronto) {
    s.servidor.close(pronto);
    s.servidor.closeAllConnections(); // o fetch mantém conexões abertas
  });
}

// Pedido "cru", sem o fetch arrumar o caminho (para testar ../)
function pedidoCru(base, caminho) {
  return new Promise(function (pronto, falhou) {
    const u = new URL(base);
    http.get({ host: u.hostname, port: u.port, path: caminho }, function (res) {
      let corpo = "";
      res.on("data", function (p) { corpo += p; });
      res.on("end", function () { pronto({ status: res.statusCode, corpo: corpo, cabecalhos: res.headers }); });
    }).on("error", falhou);
  });
}

async function api(base, acao, dados, caminho) {
  const r = await fetch(base + (caminho || "/api"), {
    method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ acao: acao, dados: dados }),
  });
  return r.json();
}

async function rodar() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "simposio-servidor-"));
  let s;
  try {
    s = await subir(pasta);

    // Página principal: o servidor avisa ao site onde está o banco
    let r = await fetch(s.base + "/");
    let html = await r.text();
    ok(r.status === 200 && /text\/html/.test(r.headers.get("content-type")), "a página principal abre");
    ok(html.includes('<script>window.SIMPOSIO_BANCO = "api";</script>\n<script src="js/main.js">'), "a página principal diz ao site que o banco está em \"api\"");
    ok(r.headers.get("x-content-type-options") === "nosniff" && r.headers.get("x-frame-options") === "SAMEORIGIN", "cabeçalhos de segurança presentes");
    r = await fetch(s.base + "/", { method: "HEAD" });
    ok(r.status === 200 && (await r.text()) === "", "HEAD da página principal responde sem corpo");

    r = await fetch(s.base + "/css/style.css");
    ok(r.status === 200 && /text\/css/.test(r.headers.get("content-type")), "arquivos de estilo saem com o tipo certo");
    r = await fetch(s.base + "/js/banco-teste.js");
    ok(r.status === 200 && /javascript/.test(r.headers.get("content-type")), "scripts saem com o tipo certo");

    r = await fetch(s.base + "/nao-existe.html");
    ok(r.status === 404 && (await r.text()).includes("<html"), "endereço inexistente mostra a página 404 do site");
    r = await pedidoCru(s.base, "/..%2f..%2fservidor%2fpackage.json");
    ok(r.status === 404 && !r.corpo.includes("nodemailer"), "não entrega arquivos de fora da pasta do site (..%2f)");
    r = await pedidoCru(s.base, "/../servidor/package.json");
    ok(r.status === 404 && !r.corpo.includes("nodemailer"), "não entrega arquivos de fora da pasta do site (../)");
    r = await fetch(s.base + "/", { method: "POST", body: "x" });
    ok(r.status === 405, "páginas só aceitam GET e HEAD");

    // API
    r = await fetch(s.base + "/api");
    let j = await r.json();
    ok(r.status === 200 && j.ok && r.headers.get("cache-control") === "no-store", "GET /api responde que o servidor está no ar, sem guardar em cache");

    j = await api(s.base, "inscricao", {
      nome: "Maria da Silva", cpf: "529.982.247-25", email: "maria@exemplo.com", celular: "(21) 98765-4321",
      categoria: "Enfermeiro(a)", instituicao: "Hospital Municipal Souza Aguiar", trabalho: "Sim", senha: "senha da Maria 1",
    });
    ok(j.ok && j.protocolo === "INS-0001" && /^[0-9a-f]{64}$/.test(j.token), "inscrição pela API grava e abre a sessão");
    const tokenMaria = j.token;
    j = await api(s.base, "painel", { token: tokenMaria });
    ok(j.ok && j.inscricao && j.inscricao.protocolo === "INS-0001", "a sessão vale no pedido seguinte");

    const linhas = fs.readFileSync(path.join(pasta, "emails.log"), "utf8").trim().split("\n").map(JSON.parse);
    ok(linhas.length === 1 && linhas[0].para === "maria@exemplo.com" && linhas[0].texto.includes("INS-0001"), "no modo arquivo, o e-mail de confirmação fica registrado em emails.log");

    j = await api(s.base, "acaoQueNaoExiste", {});
    ok(!j.ok && j.mensagem, "ação desconhecida é recusada com mensagem");
    r = await fetch(s.base + "/api", { method: "POST", body: "isto não é json" });
    j = await r.json();
    ok(r.status === 400 && j.erro === "pedido_invalido", "corpo que não é JSON é recusado");
    r = await fetch(s.base + "/api", { method: "POST", body: "null" });
    ok(r.status === 400, "JSON vazio é recusado");
    r = await fetch(s.base + "/api", { method: "POST", body: JSON.stringify({ acao: "inscricao", dados: { nome: "x".repeat(300 * 1024) } }) });
    ok(r.status === 413, "pedido grande demais é recusado");
    r = await fetch(s.base + "/api", { method: "DELETE" });
    ok(r.status === 405, "a API só aceita POST (e GET para conferir)");

    // CORS só para os endereços autorizados
    r = await fetch(s.base + "/api", { method: "POST", headers: { Origin: "https://outro-site.com" }, body: JSON.stringify({ acao: "sessao", dados: {} }) });
    ok(!r.headers.get("access-control-allow-origin"), "outro site não recebe permissão para chamar a API");
    await fechar(s);

    // Dados continuam depois de reiniciar o servidor
    s = await subir(pasta, { ORIGENS_PERMITIDAS: "https://diid.exemplo.org", CAMINHO_BASE: "/congresso-sue" });
    j = await api(s.base, "entrar", { email: "maria@exemplo.com", senha: "senha da Maria 1" }, "/congresso-sue/api");
    ok(j.ok && j.papeis.join() === "inscrito", "depois de reiniciar, a inscrita entra com a mesma senha (banco no arquivo)");
    j = await api(s.base, "painel", { token: tokenMaria }, "/congresso-sue/api");
    ok(j.ok, "a sessão aberta antes de reiniciar continua valendo");

    r = await fetch(s.base + "/congresso-sue", { redirect: "manual" });
    ok(r.status === 301 && r.headers.get("location") === "/congresso-sue/", "com CAMINHO_BASE, o endereço sem barra final ganha a barra");
    r = await fetch(s.base + "/congresso-sue/");
    html = await r.text();
    ok(r.status === 200 && html.includes("window.SIMPOSIO_BANCO"), "com CAMINHO_BASE, a página principal abre no subcaminho");
    r = await fetch(s.base + "/congresso-sue/css/style.css");
    ok(r.status === 200, "com CAMINHO_BASE, os arquivos abrem no subcaminho");
    r = await fetch(s.base + "/api", { method: "OPTIONS", headers: { Origin: "https://diid.exemplo.org" } });
    ok(r.status === 204 && r.headers.get("access-control-allow-origin") === "https://diid.exemplo.org", "endereço autorizado em ORIGENS_PERMITIDAS pode chamar a API");
    await fechar(s);

    // Arquivo do banco fica na pasta de dados
    s = null;
    ok(fs.existsSync(path.join(pasta, "simposio.db")), "o banco fica em PASTA_DADOS/simposio.db");

    // Cópia de segurança
    const copia = fazerCopia(path.join(pasta, "simposio.db"), path.join(pasta, "copias"), new Date("2026-10-08T15:30:00Z"));
    ok(path.basename(copia) === "simposio-20261008-1230.db", "a cópia de segurança leva data e hora de Brasília no nome");
    const db = new DatabaseSync(copia, { readOnly: true });
    const naCopia = db.prepare("SELECT protocolo FROM inscricoes").all();
    db.close();
    ok(naCopia.length === 1 && naCopia[0].protocolo === "INS-0001", "a cópia de segurança tem as inscrições");
  } finally {
    if (s) await fechar(s);
    fs.rmSync(pasta, { recursive: true, force: true });
  }
}

(async function () {
  try {
    await rodar();
  } catch (erro) {
    resultados.push([false, "o teste parou no meio com erro: " + (erro && erro.stack ? erro.stack.split("\n").slice(0, 2).join(" ") : erro)]);
  }
  console.log("\n== Servidor HTTP ==");
  resultados.forEach(([passou, msg]) => console.log((passou ? "ok    " : "FALHA ") + msg));
  const falhas = resultados.filter((r) => !r[0]).length;
  console.log("\n" + (resultados.length - falhas) + " de " + resultados.length + " verificações passaram.");
  if (falhas) process.exitCode = 1;
})();
