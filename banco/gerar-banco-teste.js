/* =====================================================================
   Gera site/js/banco-teste.js: o banco (apps-script.gs) rodando dentro
   do navegador, usado pelo site aberto com ?teste quando banco.urlTeste
   está vazio. Junta o molde (banco-teste-molde.js) com o código do banco.

   Uso:  node banco/gerar-banco-teste.js
   Rode sempre que mudar apps-script.gs ou o molde. Os testes do banco
   avisam quando o arquivo gerado ficou para trás.
   ===================================================================== */
const fs = require("fs");
const path = require("path");

const DESTINO = path.join(__dirname, "..", "site", "js", "banco-teste.js");
const MARCA = "/* @@CODIGO_DO_BANCO@@ */";

function gerar() {
  const molde = fs.readFileSync(path.join(__dirname, "banco-teste-molde.js"), "utf8");
  const codigo = fs.readFileSync(path.join(__dirname, "apps-script.gs"), "utf8");
  if (molde.split(MARCA).length !== 2) throw new Error("O molde precisa ter a marca " + MARCA + " uma única vez.");
  return molde.replace(MARCA, function () { return codigo.trim(); });
}

module.exports = { gerar, DESTINO };

if (require.main === module) {
  fs.writeFileSync(DESTINO, gerar());
  console.log("Gerado " + path.relative(process.cwd(), DESTINO));
}
