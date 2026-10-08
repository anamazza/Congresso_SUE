/* =====================================================================
   Configuração do servidor, lida das variáveis de ambiente.
   A lista completa, com exemplos, está em servidor/.env.exemplo.
   ===================================================================== */
"use strict";

const path = require("node:path");

function lista(valor) {
  return String(valor || "").split(/[,;\s]+/).map(function (e) { return e.trim().toLowerCase(); }).filter(Boolean);
}

function sim(valor) {
  return /^(1|true|sim|yes)$/i.test(String(valor || "").trim());
}

function lerConfig(env) {
  const regras = {
    SITE: env.URL_SITE,
    ORGANIZACAO: lista(env.ORGANIZACAO_EMAILS),
    TESTE: sim(env.TESTE),
    INSCRICOES_INICIO: env.INSCRICOES_INICIO,
    INSCRICOES_FIM: env.INSCRICOES_FIM,
    VAGAS: env.VAGAS ? Number(env.VAGAS) : undefined,
    SUBMISSAO_INICIO: env.SUBMISSAO_INICIO,
    SUBMISSAO_FIM: env.SUBMISSAO_FIM,
    RESULTADO: env.RESULTADO,
  };
  // Só sobrepõe as regras padrão com o que foi de fato configurado
  Object.keys(regras).forEach(function (k) {
    if (regras[k] === undefined || regras[k] === "") delete regras[k];
  });

  const modoEmail = String(env.EMAIL_MODO || (env.SMTP_HOST ? "smtp" : "arquivo")).toLowerCase();
  const dados = env.PASTA_DADOS || path.join(__dirname, "..", "dados");
  return {
    porta: Number(env.PORTA || 8080),
    caminhoBase: String(env.CAMINHO_BASE || "").replace(/\/+$/, ""), // ex.: /congresso-sue, se o proxy não tirar o prefixo
    arquivoBanco: env.ARQUIVO_BANCO || path.join(dados, "simposio.db"),
    pastaSite: env.PASTA_SITE || path.join(__dirname, "..", "..", "site"),
    origensPermitidas: lista(env.ORIGENS_PERMITIDAS),
    regras: regras,
    email: {
      modo: modoEmail,
      host: env.SMTP_HOST,
      porta: Number(env.SMTP_PORTA || 587),
      seguro: sim(env.SMTP_SEGURO),
      usuario: env.SMTP_USUARIO,
      senha: env.SMTP_SENHA,
      remetente: env.EMAIL_REMETENTE || env.SMTP_USUARIO,
      responderPara: env.EMAIL_RESPOSTA,
      arquivo: env.EMAIL_ARQUIVO || path.join(dados, "emails.log"),
    },
  };
}

module.exports = { lerConfig: lerConfig };
