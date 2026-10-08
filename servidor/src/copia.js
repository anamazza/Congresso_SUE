/* =====================================================================
   Cópia de segurança do banco, com o servidor no ar.
   Grava um arquivo novo em PASTA_DADOS/copias/ (ou na pasta informada),
   com a data e a hora no nome. A cópia é um banco SQLite completo: para
   restaurar, pare o servidor e coloque o arquivo no lugar de simposio.db.

   Uso:  node src/copia.js [pasta-de-destino]
         docker compose exec simposio node src/copia.js
   ===================================================================== */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { lerConfig } = require("./config.js");

function fazerCopia(arquivoBanco, pastaDestino, agora) {
  agora = agora || new Date();
  fs.mkdirSync(pastaDestino, { recursive: true });
  // Data e hora de Brasília no nome, ex.: simposio-20261008-1230.db
  const p = {};
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(agora).forEach(function (x) { p[x.type] = x.value; });
  const carimbo = p.year + p.month + p.day + "-" + p.hour + p.minute;
  const destino = path.join(pastaDestino, "simposio-" + carimbo + ".db");
  if (fs.existsSync(destino)) fs.rmSync(destino);
  const db = new DatabaseSync(arquivoBanco, { readOnly: true });
  try {
    // VACUUM INTO copia um retrato consistente, mesmo com gente usando o site
    db.prepare("VACUUM INTO ?").run(destino);
  } finally {
    db.close();
  }
  return destino;
}

module.exports = { fazerCopia: fazerCopia };

if (require.main === module) {
  const config = lerConfig(process.env);
  const pasta = process.argv[2] || path.join(path.dirname(path.resolve(config.arquivoBanco)), "copias");
  const destino = fazerCopia(config.arquivoBanco, pasta);
  console.log("Cópia gravada em " + destino);
}
