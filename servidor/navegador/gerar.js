/* =====================================================================
   Gera site/js/banco-teste.js: as regras do servidor rodando dentro do
   navegador, usadas pelo modo de teste do site. Junta o molde com
   servidor/src/regras.js e servidor/src/repo-memoria.js.

   Uso:  node servidor/navegador/gerar.js
   Rode sempre que mudar as regras, o repositório em memória ou o molde.
   Os testes avisam quando o arquivo gerado ficou para trás.
   ===================================================================== */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DESTINO = path.join(__dirname, "..", "..", "site", "js", "banco-teste.js");

function gerar() {
  const molde = fs.readFileSync(path.join(__dirname, "molde.js"), "utf8");
  const regras = fs.readFileSync(path.join(__dirname, "..", "src", "regras.js"), "utf8");
  const repo = fs.readFileSync(path.join(__dirname, "..", "src", "repo-memoria.js"), "utf8");
  for (const marca of ["/* @@REGRAS@@ */", "/* @@REPO_MEMORIA@@ */"]) {
    if (molde.split(marca).length !== 2) throw new Error("O molde precisa ter a marca " + marca + " uma única vez.");
  }
  return molde
    .replace("/* @@REGRAS@@ */", function () { return regras.trim(); })
    .replace("/* @@REPO_MEMORIA@@ */", function () { return repo.trim(); });
}

module.exports = { gerar: gerar, DESTINO: DESTINO };

if (require.main === module) {
  fs.writeFileSync(DESTINO, gerar());
  console.log("Gerado " + path.relative(process.cwd(), DESTINO));
}
