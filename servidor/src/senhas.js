/* Senhas no servidor: scrypt com sal próprio. Guarda "scrypt$N$r$p$sal$resultado";
   a senha em si nunca é gravada e não dá para recuperá-la a partir do banco. */
"use strict";

const crypto = require("node:crypto");
const N = 16384, R = 8, P = 1, TAMANHO = 32;

function proteger(senha) {
  const sal = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(senha), sal, TAMANHO, { N: N, r: R, p: P });
  return ["scrypt", N, R, P, sal.toString("hex"), h.toString("hex")].join("$");
}

function confere(senha, guardada) {
  const p = String(guardada || "").split("$");
  if (p.length !== 6 || p[0] !== "scrypt") return false;
  const esperado = Buffer.from(p[5], "hex");
  if (esperado.length !== TAMANHO) return false;
  const h = crypto.scryptSync(String(senha), Buffer.from(p[4], "hex"), TAMANHO, { N: Number(p[1]), r: Number(p[2]), p: Number(p[3]) });
  return crypto.timingSafeEqual(h, esperado);
}

function aleatorio(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

function resumo(texto) {
  return crypto.createHash("sha256").update(String(texto), "utf8").digest("hex");
}

module.exports = { proteger: proteger, confere: confere, aleatorio: aleatorio, resumo: resumo };
