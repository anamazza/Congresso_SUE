/* =====================================================================
   Envio de e-mail do servidor.
   - "smtp": envia pelo servidor de e-mail institucional (variáveis SMTP_*).
   - "arquivo": não envia; grava cada e-mail numa linha de um arquivo, útil
     para testes e para conferir a instalação antes de ligar o SMTP.
   - "desligado": não envia nem grava.
   ===================================================================== */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

function criarEmail(cfg) {
  if (cfg.modo === "smtp") {
    const nodemailer = require("nodemailer");
    const transporte = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.porta,
      secure: cfg.seguro,
      auth: cfg.usuario ? { user: cfg.usuario, pass: cfg.senha } : undefined,
    });
    return {
      enviar: async function (m) {
        await transporte.sendMail({
          from: cfg.remetente, to: m.para, subject: m.assunto, text: m.texto, html: m.html,
          replyTo: cfg.responderPara || undefined,
        });
        return "enviado";
      },
    };
  }
  if (cfg.modo === "arquivo") {
    fs.mkdirSync(path.dirname(cfg.arquivo), { recursive: true });
    return {
      enviar: async function (m) {
        fs.appendFileSync(cfg.arquivo, JSON.stringify({ quando: new Date().toISOString(), para: m.para, assunto: m.assunto, texto: m.texto }) + "\n");
        return "enviado (registrado em arquivo)";
      },
    };
  }
  return { enviar: async function () { return "não enviado: e-mail desligado"; } };
}

module.exports = { criarEmail: criarEmail };
