/* =====================================================================
   Testes do banco (apps-script.gs) fora do Google.
   Simula a planilha, o e-mail, a trava e o relógio do Apps Script e
   roda o código de verdade contra as regras do edital.

   Uso:  node banco/testar-banco.js
   ===================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CODIGO = fs.readFileSync(path.join(__dirname, "apps-script.gs"), "utf8");

// ---------- Simulação dos serviços do Google ----------
class Folha {
  constructor(nome) { this.nome = nome; this.dados = []; }
  getName() { return this.nome; }
  getLastRow() { return this.dados.length; }
  appendRow(valores) { this.dados.push(valores.slice()); return this; }
  setFrozenRows() { return this; }
  getRange(linha, coluna, nLinhas, nColunas) { return new Intervalo(this, linha, coluna, nLinhas || 1, nColunas || 1); }
}
class Intervalo {
  constructor(folha, l, c, nl, nc) { Object.assign(this, { folha, l, c, nl, nc }); }
  getValues() {
    const r = [];
    for (let i = 0; i < this.nl; i++) {
      const linha = this.folha.dados[this.l - 1 + i] || [];
      const out = [];
      for (let j = 0; j < this.nc; j++) out.push(linha[this.c - 1 + j] === undefined ? "" : linha[this.c - 1 + j]);
      r.push(out);
    }
    return r;
  }
  setValues(m) {
    m.forEach((linha, i) => {
      const alvo = (this.folha.dados[this.l - 1 + i] = this.folha.dados[this.l - 1 + i] || []);
      linha.forEach((v, j) => { alvo[this.c - 1 + j] = v; });
    });
    return this;
  }
  setValue(v) { return this.setValues([[v]]); }
  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
}
class Planilha {
  constructor() { this.folhas = { "Página1": new Folha("Página1") }; }
  getId() { return "planilha-teste"; }
  getName() { return "Banco de teste"; }
  getSheetByName(n) { return this.folhas[n] || null; }
  insertSheet(n) { return (this.folhas[n] = new Folha(n)); }
}

function criarBanco(opcoes) {
  opcoes = opcoes || {};
  const planilha = new Planilha();
  const props = {};
  const emails = [];
  const estado = { agora: new Date(opcoes.agora || "2026-10-07T12:00:00-03:00"), cota: 100, falharEmail: false };
  const DataBase = Date;
  class DataFalsa extends DataBase {
    constructor(...a) { if (a.length) super(...a); else super(estado.agora.getTime()); }
    static now() { return estado.agora.getTime(); }
  }
  const ctx = {
    Date: DataFalsa,
    console: { log() {}, error() {} },
    JSON, Math, String, Number, Array, Object, RegExp, Error,
    SpreadsheetApp: { getActiveSpreadsheet: () => planilha, openById: () => planilha },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (t) => ({ conteudo: t, setMimeType() { return this; }, getContent() { return this.conteudo; } }),
    },
    MailApp: {
      getRemainingDailyQuota: () => estado.cota,
      sendEmail: (m) => {
        if (estado.falharEmail) throw new Error("Serviço de e-mail indisponível");
        emails.push(m);
        estado.cota--;
      },
    },
    Utilities: {
      formatDate: (data, fuso) => new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(data),
    },
  };
  vm.createContext(ctx);
  vm.runInContext(CODIGO + "\n;globalThis.__banco = { doPost, doGet, configurar, CONFIG, ABAS };", ctx);
  const api = ctx.__banco;
  return {
    api, planilha, emails, estado, props,
    enviar(acao, dados) {
      return JSON.parse(api.doPost({ postData: { contents: JSON.stringify({ acao, dados }) } }).getContent());
    },
    bruto(texto) {
      return JSON.parse(api.doPost({ postData: { contents: texto } }).getContent());
    },
    aba(nome) { return planilha.getSheetByName(nome); },
  };
}

// ---------- Dados de exemplo ----------
const CPFS = ["529.982.247-25", "111.444.777-35", "935.411.347-80", "123.456.789-09"];
function inscricao(extra) {
  return Object.assign({
    nome: "Maria da Silva", cpf: CPFS[0], email: "maria@exemplo.com", celular: "(21) 98765-4321",
    categoria: "Enfermeiro(a)", instituicao: "Hospital Municipal Souza Aguiar", trabalho: "Sim",
  }, extra);
}
function trabalho(extra) {
  return Object.assign({
    cpf: CPFS[0], email: "maria@exemplo.com",
    titulo: "Sepse na sala vermelha: tempo até o antibiótico",
    tipo: "Estudo original observacional", eixo: "Emergências clínicas do adulto",
    coautores: [{ nome: "João Souza", instituicao: "CER Barra" }],
    apresentador: "primeiro", apresentadorCpf: "",
    introducao: "Introdução do estudo.", metodos: "Métodos do estudo.",
    resultados: "Resultados com IC 95%.", conclusoes: "Conclusões.",
  }, extra);
}

// ---------- Testes ----------
function rodar() {
  const resultados = [];
  const ok = (cond, msg) => resultados.push([!!cond, msg]);

  {
    const b = criarBanco();
    b.api.configurar();
    ok(b.aba("Inscrições") && b.aba("Trabalhos"), "configurar cria as abas Inscrições e Trabalhos");
    ok(b.aba("Inscrições").dados[0][0] === "Protocolo" && b.aba("Trabalhos").dados[0].length === 19, "cabeçalhos gravados");
    ok(b.props.PLANILHA_ID === "planilha-teste", "configurar guarda o id da planilha");
    ok(JSON.parse(b.api.doGet().getContent()).ok, "doGet responde que o banco está no ar");

    // Inscrição
    let r = b.enviar("inscricao", inscricao({ email: " Maria@Exemplo.com ", cpf: "52998224725", celular: "21987654321" }));
    ok(r.ok && r.protocolo === "INS-0001" && r.nome === "Maria", "inscrição válida recebe INS-0001");
    const l = b.aba("Inscrições").dados[1];
    ok(l[3] === "529.982.247-25" && l[4] === "maria@exemplo.com" && l[5] === "(21) 98765-4321", "CPF, e-mail e celular gravados no formato padrão");
    ok(l[9] === "enviado" && b.emails.length === 1 && b.emails[0].to === "maria@exemplo.com", "e-mail de confirmação enviado e registrado");
    ok(b.emails[0].body.includes("INS-0001"), "e-mail traz o número de inscrição");

    r = b.enviar("inscricao", inscricao({ nome: "Outra Pessoa", email: "outra@exemplo.com" }));
    ok(!r.ok && r.erro === "cpf_duplicado" && r.campo === "cpf" && r.mensagem.includes("INS-0001"), "CPF repetido é recusado e o banco informa o número já existente");

    const invalidos = [
      [{ nome: "Maria" }, "nome"], [{ cpf: "123.456.789-00" }, "cpf"], [{ email: "maria@" }, "email"],
      [{ celular: "9876-543" }, "celular"], [{ categoria: "Astronauta" }, "categoria"], [{ instituicao: "  " }, "instituicao"],
    ];
    invalidos.forEach(([extra, campo]) => {
      const x = b.enviar("inscricao", inscricao(Object.assign({ cpf: CPFS[3] }, extra)));
      ok(!x.ok && x.campo === campo, "inscrição com " + campo + " inválido é recusada");
    });
    ok(b.aba("Inscrições").dados.length === 2, "nenhuma inscrição inválida foi gravada");

    r = b.enviar("inscricao", inscricao({ nome: "=HIPERLINK(\"x\") Silva", cpf: CPFS[1], email: "joao@exemplo.com", trabalho: "talvez" }));
    const l2 = b.aba("Inscrições").dados[2];
    ok(r.ok && r.protocolo === "INS-0002" && l2[2].startsWith("'="), "texto que pareceria fórmula é gravado como texto");
    ok(l2[8] === "Não informado", "intenção de submeter fora da lista vira \"Não informado\"");

    // Trabalho
    r = b.enviar("trabalho", trabalho());
    const t = b.aba("Trabalhos").dados[1];
    ok(r.ok && r.protocolo === "TRB-0001", "trabalho de inscrita recebe TRB-0001");
    ok(t[5] === "Maria da Silva" && t[6] === "529.982.247-25" && t[10] === "Maria da Silva", "primeiro autor e apresentador vêm da inscrição");
    ok(t[8] === "2. João Souza · CER Barra" && t[9] === 2, "coautores numerados a partir do autor 2");
    ok(t[16] === "Introduçãodoestudo.Métodosdoestudo.ResultadoscomIC95%.Conclusões.".length, "caracteres contados sem espaços");
    ok(t[18] === "enviado" && b.emails[b.emails.length - 1].subject.includes("TRB-0001"), "confirmação do trabalho enviada");

    r = b.enviar("trabalho", trabalho({ titulo: "Outro", email: "errado@exemplo.com" }));
    ok(!r.ok && r.erro === "nao_inscrito" && r.campo === "cpf", "e-mail diferente do da inscrição é recusado");
    r = b.enviar("trabalho", trabalho({ titulo: "Outro", cpf: CPFS[2] }));
    ok(!r.ok && r.erro === "nao_inscrito", "CPF sem inscrição é recusado");

    r = b.enviar("trabalho", trabalho({ titulo: "Com apresentador", apresentador: "coautor", apresentadorCpf: CPFS[2] }));
    ok(!r.ok && r.erro === "apresentador_nao_inscrito" && r.campo === "apresentadorCpf", "apresentador sem inscrição é recusado");
    r = b.enviar("trabalho", trabalho({ titulo: "Com apresentador", apresentador: "coautor", apresentadorCpf: CPFS[1] }));
    ok(r.ok && b.aba("Trabalhos").dados[2][11] === "111.444.777-35", "apresentador inscrito é aceito");

    const nove = Array.from({ length: 9 }, (_, i) => ({ nome: "Coautor " + (i + 2), instituicao: "Unidade" }));
    r = b.enviar("trabalho", trabalho({ titulo: "Dez autores", coautores: nove }));
    ok(r.ok && b.aba("Trabalhos").dados[3][9] === 10, "dez autores no total são aceitos");
    r = b.enviar("trabalho", trabalho({ titulo: "Onze autores", coautores: nove.concat([{ nome: "Mais Um", instituicao: "X" }]) }));
    ok(!r.ok && r.campo === "coautores", "onze autores são recusados");
    r = b.enviar("trabalho", trabalho({ titulo: "Sem instituição", coautores: [{ nome: "João Souza", instituicao: "" }] }));
    ok(!r.ok && r.campo === "coautores", "coautor sem instituição é recusado");

    r = b.enviar("trabalho", trabalho({ titulo: "Repetido", metodos: "" }));
    ok(!r.ok && r.erro === "resumo_incompleto" && r.campo === "metodos", "resumo com parte vazia é recusado");
    const exato = "a".repeat(2050 - 3);
    r = b.enviar("trabalho", trabalho({ titulo: "Longo", introducao: "a b\n" + exato, metodos: "x", resultados: "y", conclusoes: "z" }));
    ok(!r.ok && r.erro === "resumo_longo", "resumo acima de 2.050 caracteres é recusado");
    r = b.enviar("trabalho", trabalho({ titulo: "Sepse na sala vermelha: tempo até o antibiótico" }));
    ok(!r.ok && r.erro === "trabalho_repetido" && r.mensagem.includes("TRB-0001"), "mesmo título do mesmo autor é tratado como reenvio");
    r = b.enviar("trabalho", trabalho({ titulo: "Quarto trabalho" }));
    ok(!r.ok && r.erro === "limite_trabalhos", "quarto trabalho como primeiro autor é recusado");
    r = b.enviar("trabalho", trabalho({ titulo: "Do João", cpf: CPFS[1], email: "joao@exemplo.com", introducao: "a".repeat(2047), metodos: "b", resultados: "c", conclusoes: "d" }));
    ok(r.ok && r.caracteres === 2050, "resumo com exatamente 2.050 caracteres é aceito");

    ok(b.bruto("{isso não é json").erro === "pedido_invalido", "pedido ilegível é recusado");
    ok(b.enviar("outra", {}).erro === "acao_invalida", "ação desconhecida é recusada");
  }

  // Prazo do envio de trabalhos, no fuso de Brasília
  {
    const b = criarBanco({ agora: "2026-10-31T23:30:00-03:00" });
    b.api.configurar();
    b.enviar("inscricao", inscricao());
    ok(b.enviar("trabalho", trabalho()).ok, "31/10 às 23h30 de Brasília ainda aceita trabalho");
    b.estado.agora = new Date("2026-11-01T00:30:00-03:00");
    const r = b.enviar("trabalho", trabalho({ titulo: "Atrasado" }));
    ok(!r.ok && r.erro === "fora_do_prazo", "01/11 às 00h30 de Brasília recusa trabalho");
    b.estado.agora = new Date("2026-10-05T23:30:00-03:00");
    ok(b.enviar("inscricao", inscricao({ cpf: CPFS[1] })).erro === "fora_do_prazo", "inscrição em 05/10 às 23h30 é recusada");
    b.estado.agora = new Date("2026-10-06T00:10:00-03:00");
    ok(b.enviar("inscricao", inscricao({ cpf: CPFS[1], email: "joao@exemplo.com" })).ok, "inscrição em 06/10 às 00h10 é aceita");
    b.estado.agora = new Date("2026-11-30T23:30:00-03:00");
    ok(b.enviar("inscricao", inscricao({ cpf: CPFS[2], email: "c@exemplo.com" })).ok, "inscrição em 30/11 às 23h30 é aceita");
    b.estado.agora = new Date("2026-12-01T00:10:00-03:00");
    ok(b.enviar("inscricao", inscricao({ cpf: CPFS[3], email: "d@exemplo.com" })).erro === "fora_do_prazo", "inscrição em 01/12 às 00h10 é recusada");
  }

  // Vagas, cota de e-mail e falha de e-mail
  {
    const b = criarBanco();
    b.api.configurar();
    b.api.CONFIG.VAGAS = 2;
    b.enviar("inscricao", inscricao());
    b.estado.cota = 0;
    const r1 = b.enviar("inscricao", inscricao({ cpf: CPFS[1], email: "a@exemplo.com" }));
    ok(r1.ok && b.aba("Inscrições").dados[2][9].includes("limite diário"), "sem cota de e-mail a inscrição é gravada e a planilha avisa");
    const r2 = b.enviar("inscricao", inscricao({ cpf: CPFS[2], email: "b@exemplo.com" }));
    ok(!r2.ok && r2.erro === "vagas_esgotadas", "com VAGAS = 2, a terceira inscrição é recusada");
    b.api.CONFIG.VAGAS = 0;
    b.estado.cota = 100;
    b.estado.falharEmail = true;
    const r3 = b.enviar("inscricao", inscricao({ cpf: CPFS[2], email: "b@exemplo.com" }));
    ok(r3.ok && b.aba("Inscrições").dados[3][9].startsWith("não enviado"), "falha no e-mail não impede a inscrição");
    b.aba("Inscrições").dados.splice(2, 1);
    ok(b.enviar("inscricao", inscricao({ cpf: CPFS[3], email: "c@exemplo.com" })).protocolo === "INS-0004", "apagar uma linha não repete protocolo");
  }

  const falhas = resultados.filter((r) => !r[0]);
  resultados.forEach(([passou, msg]) => console.log((passou ? "ok    " : "FALHA ") + msg));
  console.log("\n" + (resultados.length - falhas.length) + " de " + resultados.length + " verificações passaram.");
  if (falhas.length) process.exitCode = 1;
}

module.exports = { criarBanco };
if (require.main === module) rodar();
