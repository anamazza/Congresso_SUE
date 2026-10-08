/* =====================================================================
   Testes do banco (apps-script.gs) fora do Google.
   Simula a planilha, o e-mail, a trava, o cache, a criptografia e o
   relógio do Apps Script e roda o código de verdade contra as regras do
   edital e da área do inscrito.

   Uso:  node banco/testar-banco.js
   ===================================================================== */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

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

// O Apps Script devolve bytes de -128 a 127
const bytesComSinal = (buf) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));

function criarBanco(opcoes) {
  opcoes = opcoes || {};
  const planilha = new Planilha();
  const props = {};
  const emails = [];
  const cache = new Map();
  const estado = { agora: new Date(opcoes.agora || "2026-10-07T12:00:00-03:00"), cota: 100, falharEmail: false };
  const DataBase = Date;
  class DataFalsa extends DataBase {
    constructor(...a) { if (a.length) super(...a); else super(estado.agora.getTime()); }
    static now() { return estado.agora.getTime(); }
  }
  const ctx = {
    Date: DataFalsa,
    console: { log() {}, error() {} },
    JSON, Math, String, Number, Array, Object, RegExp, Error, parseInt,
    SpreadsheetApp: { getActiveSpreadsheet: () => planilha, openById: () => planilha },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => {
          const e = cache.get(k);
          if (!e) return null;
          if (e.expira <= estado.agora.getTime()) { cache.delete(k); return null; }
          return e.valor;
        },
        put: (k, v, segundos) => { cache.set(k, { valor: String(v), expira: estado.agora.getTime() + (segundos || 600) * 1000 }); },
        remove: (k) => { cache.delete(k); },
      }),
    },
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
      DigestAlgorithm: { SHA_256: "sha256" },
      Charset: { UTF_8: "utf8" },
      computeDigest: (_alg, texto) => bytesComSinal(crypto.createHash("sha256").update(String(texto), "utf8").digest()),
      computeHmacSha256Signature: (valor, chave) => bytesComSinal(crypto.createHmac("sha256", chave).update(String(valor), "utf8").digest()),
      getUuid: () => crypto.randomUUID(),
      formatDate: (data, fuso, formato) => {
        const p = {};
        new Intl.DateTimeFormat("en-CA", {
          timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
        }).formatToParts(data).forEach((x) => { p[x.type] = x.value; });
        return formato.replace(/yyyy|MM|dd|HH|mm/g, (t) => ({ yyyy: p.year, MM: p.month, dd: p.day, HH: p.hour, mm: p.minute })[t]);
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(CODIGO + "\n;globalThis.__banco = { doPost, doGet, configurar, CONFIG, ABAS };", ctx);
  const api = ctx.__banco;
  const banco = {
    api, planilha, emails, estado, props, cache,
    enviar(acao, dados) {
      return JSON.parse(api.doPost({ postData: { contents: JSON.stringify({ acao, dados }) } }).getContent());
    },
    bruto(texto) {
      return JSON.parse(api.doPost({ postData: { contents: texto } }).getContent());
    },
    aba(nome) { return planilha.getSheetByName(nome); },
    // Inscreve e devolve o token da sessão aberta pela inscrição
    inscrever(extra) {
      const r = banco.enviar("inscricao", inscricao(extra));
      if (!r.ok) throw new Error("inscrição de exemplo recusada: " + r.mensagem);
      return r.token;
    },
    passarMinutos(n) { estado.agora = new Date(estado.agora.getTime() + n * 60000); },
    // Código de 6 números do último e-mail enviado
    ultimoCodigo() {
      const m = emails[emails.length - 1].body.match(/\b(\d{6})\b/);
      return m ? m[1] : "";
    },
  };
  return banco;
}

// ---------- Dados de exemplo ----------
const CPFS = ["529.982.247-25", "111.444.777-35", "935.411.347-80", "123.456.789-09"];
const SENHA = "senha da Maria 1";
// Gera um CPF válido a partir de 9 dígitos, para montar listas de coautores
function gerarCpf(base) {
  const d = String(base).padStart(9, "0").split("").map(Number);
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += d[i] * (t + 1 - i);
    d.push(((soma * 10) % 11) % 10);
  }
  const x = d.join("");
  return x.slice(0, 3) + "." + x.slice(3, 6) + "." + x.slice(6, 9) + "-" + x.slice(9);
}
function coautor(n, extra) {
  return Object.assign({ nome: "Coautor Número" + n, cpf: gerarCpf(200000000 + n), email: "coautor" + n + "@exemplo.com", instituicao: "Unidade " + n }, extra);
}
function inscricao(extra) {
  return Object.assign({
    nome: "Maria da Silva", cpf: CPFS[0], email: "maria@exemplo.com", celular: "(21) 98765-4321",
    categoria: "Enfermeiro(a)", instituicao: "Hospital Municipal Souza Aguiar", trabalho: "Sim", senha: SENHA,
  }, extra);
}
function trabalho(token, extra) {
  return Object.assign({
    token,
    titulo: "Sepse na sala vermelha: tempo até o antibiótico",
    tipo: "Estudo original observacional", eixo: "Emergências clínicas do adulto",
    coautores: [{ nome: "João Souza", cpf: gerarCpf(300000001), email: "Joao.Souza@exemplo.com", instituicao: "CER Barra" }],
    apresentador: "primeiro", apresentadorCpf: "",
    introducao: "Introdução do estudo.", metodos: "Métodos do estudo.",
    resultados: "Resultados com IC 95%.", conclusoes: "Conclusões.",
  }, extra);
}

// ---------- Testes ----------
function rodar() {
  const resultados = [];
  const ok = (cond, msg) => resultados.push([!!cond, msg]);

  // Inscrição e envio de trabalho
  {
    const b = criarBanco();
    b.api.configurar();
    ok(b.aba("Inscrições") && b.aba("Trabalhos") && b.aba("Acessos"), "configurar cria as abas Inscrições, Trabalhos e Acessos");
    ok(b.aba("Inscrições").dados[0][0] === "Protocolo" && b.aba("Trabalhos").dados[0].length === 19, "cabeçalhos gravados");
    ok(b.props.PLANILHA_ID === "planilha-teste" && /^[0-9a-f]{64}$/.test(b.props.SEGREDO_SENHAS), "configurar guarda o id da planilha e cria o segredo das senhas");
    ok(JSON.parse(b.api.doGet().getContent()).ok, "doGet responde que o banco está no ar");

    // Inscrição
    let r = b.enviar("inscricao", inscricao({ email: " Maria@Exemplo.com ", cpf: "52998224725", celular: "21987654321" }));
    ok(r.ok && r.protocolo === "INS-0001" && r.nome === "Maria", "inscrição válida recebe INS-0001");
    ok(/^[0-9a-f]{64}$/.test(r.token), "a inscrição já abre a sessão da área do inscrito");
    const tokenMaria = r.token;
    const l = b.aba("Inscrições").dados[1];
    ok(l[3] === "529.982.247-25" && l[4] === "maria@exemplo.com" && l[5] === "(21) 98765-4321", "CPF, e-mail e celular gravados no formato padrão");
    ok(l[9] === "enviado" && b.emails.length === 1 && b.emails[0].to === "maria@exemplo.com", "e-mail de confirmação enviado e registrado");
    ok(b.emails[0].body.includes("INS-0001") && b.emails[0].body.includes("#/area"), "e-mail traz o número de inscrição e o caminho da área do inscrito");
    const acesso = b.aba("Acessos").dados[1];
    ok(acesso[0] === "maria@exemplo.com" && acesso[1] === "529.982.247-25" && /^500\$[0-9a-f]{32}\$[0-9a-f]{64}$/.test(acesso[2]), "a aba Acessos guarda e-mail, CPF e a senha protegida");
    ok(!JSON.stringify(b.planilha.folhas).includes(SENHA), "a senha não aparece em nenhuma aba da planilha");

    r = b.enviar("inscricao", inscricao({ nome: "Outra Pessoa", email: "outra@exemplo.com" }));
    ok(!r.ok && r.erro === "cpf_duplicado" && r.campo === "cpf" && r.mensagem.includes("INS-0001"), "CPF repetido é recusado e o banco informa o número já existente");
    r = b.enviar("inscricao", inscricao({ nome: "Outra Pessoa", cpf: CPFS[2], email: " MARIA@exemplo.com" }));
    ok(!r.ok && r.erro === "email_duplicado" && r.campo === "email", "e-mail já usado em outra inscrição é recusado");

    const invalidos = [
      [{ nome: "Maria" }, "nome"], [{ cpf: "123.456.789-00" }, "cpf"], [{ email: "maria@" }, "email"],
      [{ celular: "9876-543" }, "celular"], [{ categoria: "Astronauta" }, "categoria"], [{ instituicao: "  " }, "instituicao"],
      [{ senha: "1234567" }, "senha"], [{ senha: undefined }, "senha"], [{ senha: 12345678 }, "senha"], [{ senha: "x".repeat(101) }, "senha"],
    ];
    invalidos.forEach(([extra, campo]) => {
      const x = b.enviar("inscricao", inscricao(Object.assign({ cpf: CPFS[3], email: "nova@exemplo.com" }, extra)));
      ok(!x.ok && x.campo === campo, "inscrição com " + campo + " inválido é recusada (" + JSON.stringify(extra).slice(0, 30) + ")");
    });
    const celularesRuins = [["(21) 8765-4321", "sem o 9 inicial"], ["(21) 88765-4321", "começando com 8"], ["(01) 98765-4321", "com DDD 01"], ["(20) 98765-4321", "com DDD 20"]];
    celularesRuins.forEach(([celular, caso]) => {
      const x = b.enviar("inscricao", inscricao({ cpf: CPFS[3], email: "nova@exemplo.com", celular }));
      ok(!x.ok && x.campo === "celular", "celular " + caso + " é recusado");
    });
    ok(b.aba("Inscrições").dados.length === 2 && b.aba("Acessos").dados.length === 2, "nenhuma inscrição inválida foi gravada");

    r = b.enviar("inscricao", inscricao({ nome: "=HIPERLINK(\"x\") Silva", cpf: CPFS[1], email: "joao@exemplo.com", trabalho: "talvez", senha: "senha do João" }));
    const l2 = b.aba("Inscrições").dados[2];
    ok(r.ok && r.protocolo === "INS-0002" && l2[2].startsWith("'="), "texto que pareceria fórmula é gravado como texto");
    ok(l2[8] === "Não informado", "intenção de submeter fora da lista vira \"Não informado\"");
    const tokenJoao = r.token;
    ok(b.aba("Acessos").dados[2][2] !== b.aba("Acessos").dados[1][2], "cada senha é protegida com um sal próprio");

    // Trabalho: só com a sessão aberta
    r = b.enviar("trabalho", trabalho(""));
    ok(!r.ok && r.erro === "sessao", "trabalho sem sessão é recusado");
    r = b.enviar("trabalho", trabalho("0".repeat(64)));
    ok(!r.ok && r.erro === "sessao", "trabalho com sessão inventada é recusado");
    r = b.enviar("trabalho", Object.assign(trabalho(""), { cpf: CPFS[0], email: "maria@exemplo.com" }));
    ok(!r.ok && r.erro === "sessao", "CPF e e-mail no lugar da sessão não bastam para enviar");

    r = b.enviar("trabalho", trabalho(tokenMaria));
    const t = b.aba("Trabalhos").dados[1];
    ok(r.ok && r.protocolo === "TRB-0001", "trabalho de inscrita com sessão recebe TRB-0001");
    ok(t[5] === "Maria da Silva" && t[6] === "529.982.247-25" && t[7] === "maria@exemplo.com" && t[10] === "Maria da Silva", "primeiro autor, e-mail e apresentador vêm da inscrição da sessão");
    ok(t[8] === "2. João Souza · CPF " + gerarCpf(300000001) + " · joao.souza@exemplo.com · CER Barra" && t[9] === 2, "coautor gravado com nome, CPF, e-mail e instituição, a partir do autor 2");
    ok(t[16] === "Introduçãodoestudo.Métodosdoestudo.ResultadoscomIC95%.Conclusões.".length, "caracteres contados sem espaços");
    ok(t[18] === "enviado" && b.emails[b.emails.length - 1].subject.includes("TRB-0001"), "confirmação do trabalho enviada");

    const coautorNaoInscrito = { nome: "Carla Dias", cpf: CPFS[2], email: "carla@exemplo.com" };
    r = b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Com apresentador", coautores: [coautorNaoInscrito], apresentador: "coautor", apresentadorCpf: CPFS[2] }));
    ok(!r.ok && r.erro === "apresentador_nao_inscrito" && r.campo === "apresentador" && r.mensagem.includes("Carla Dias"), "coautor apresentador sem inscrição é recusado");
    r = b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Com apresentador", apresentador: "coautor", apresentadorCpf: CPFS[1] }));
    ok(!r.ok && r.campo === "apresentador", "apresentador que não está entre os coautores é recusado");
    const coautorInscrito = { nome: "João Inscrito", cpf: CPFS[1], email: "joao@exemplo.com" };
    r = b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Com apresentador", coautores: [coautorInscrito], apresentador: "coautor", apresentadorCpf: CPFS[1] }));
    ok(r.ok && b.aba("Trabalhos").dados[2][11] === "111.444.777-35", "coautor inscrito pode apresentar");

    const sete = Array.from({ length: 7 }, (_, i) => coautor(i + 2));
    r = b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Oito autores", coautores: sete }));
    ok(r.ok && b.aba("Trabalhos").dados[3][9] === 8, "oito autores no total são aceitos");
    r = b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Nove autores", coautores: sete.concat([coautor(9)]) }));
    ok(!r.ok && r.campo === "coautores", "nove autores são recusados");
    r = b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Coautor repete a autora", coautores: [coautor(2, { cpf: CPFS[0] })] }));
    ok(!r.ok && r.campo === "coautores", "coautor com o CPF da primeira autora é recusado");

    r = b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Repetido", metodos: "" }));
    ok(!r.ok && r.erro === "resumo_incompleto" && r.campo === "metodos", "resumo com parte vazia é recusado");
    const exato = "a".repeat(2500 - 3);
    r = b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Longo", introducao: "a b\n" + exato, metodos: "x", resultados: "y", conclusoes: "z" }));
    ok(!r.ok && r.erro === "resumo_longo", "resumo acima de 2.500 caracteres é recusado");
    r = b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Sepse na sala vermelha: tempo até o antibiótico" }));
    ok(!r.ok && r.erro === "trabalho_repetido" && r.mensagem.includes("TRB-0001"), "mesmo título do mesmo autor é tratado como reenvio");
    r = b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Quarto trabalho" }));
    ok(!r.ok && r.erro === "limite_trabalhos", "quarto trabalho como primeiro autor é recusado");
    r = b.enviar("trabalho", trabalho(tokenJoao, { titulo: "Do João", coautores: [{ nome: "Maria da Silva", cpf: CPFS[0], email: "maria@exemplo.com" }], introducao: "a".repeat(2497), metodos: "b", resultados: "c", conclusoes: "d" }));
    ok(r.ok && r.caracteres === 2500 && b.aba("Trabalhos").dados[4][6] === "111.444.777-35", "resumo com exatamente 2.500 caracteres é aceito, em nome de quem está na sessão");

    // Painel da área do inscrito
    r = b.enviar("painel", { token: tokenMaria });
    ok(r.ok && r.inscricao.protocolo === "INS-0001" && r.inscricao.nome === "Maria da Silva" && r.inscricao.cpf === "529.982.247-25", "painel mostra a inscrição de quem entrou");
    ok(r.inscricao.email === "maria@exemplo.com" && r.inscricao.celular === "(21) 98765-4321" && r.inscricao.categoria === "Enfermeiro(a)" && r.inscricao.data === "07/10/2026 12:00", "painel traz e-mail, celular, categoria e data da inscrição");
    const papeis = r.trabalhos.map((x) => x.protocolo + ":" + x.papel).join(",");
    ok(papeis === "TRB-0001:Primeiro autor,TRB-0002:Primeiro autor,TRB-0003:Primeiro autor,TRB-0004:Coautor", "painel lista os trabalhos como primeira autora e como coautora");
    ok(r.submissao.aberta === true && r.submissao.restantes === 0 && r.submissao.maximo === 3 && r.submissao.prazo === "06/11/2026", "painel informa prazo e trabalhos que ainda pode enviar");
    ok(!/senha|\$[0-9a-f]{32}\$/.test(JSON.stringify(r)), "painel não devolve nada da senha");
    r = b.enviar("painel", { token: tokenJoao });
    ok(r.ok && r.inscricao.nome.endsWith("Silva") && r.trabalhos.length === 2 && r.submissao.restantes === 2, "cada sessão vê só a própria inscrição");
    ok(b.enviar("painel", {}).erro === "sessao", "painel sem sessão é recusado");

    ok(b.bruto("{isso não é json").erro === "pedido_invalido", "pedido ilegível é recusado");
    ok(b.enviar("outra", {}).erro === "acao_invalida", "ação desconhecida é recusada");
    ok(["constructor", "toString", "__proto__", "hasOwnProperty"].every((a) => b.enviar(a, {}).erro === "acao_invalida"), "nomes internos do JavaScript não viram ação");
  }

  // Entrar, sair e duração da sessão
  {
    const b = criarBanco();
    b.api.configurar();
    b.inscrever();
    let r = b.enviar("entrar", { email: " MARIA@exemplo.com", senha: SENHA });
    ok(r.ok && /^[0-9a-f]{64}$/.test(r.token) && r.nome === "Maria", "entrar com e-mail e senha certos abre a sessão");
    const token = r.token;
    r = b.enviar("entrar", { email: "maria@exemplo.com", senha: SENHA.toUpperCase() });
    ok(!r.ok && r.erro === "credenciais" && r.campo === "senha", "senha errada é recusada");
    const naoExiste = b.enviar("entrar", { email: "ninguem@exemplo.com", senha: SENHA });
    ok(!naoExiste.ok && naoExiste.mensagem === r.mensagem, "e-mail sem inscrição recebe a mesma mensagem da senha errada");
    ok(b.enviar("entrar", { email: "maria@exemplo.com", senha: "" }).campo === "senha" && b.enviar("entrar", { email: "maria@", senha: SENHA }).campo === "email", "entrar sem senha ou com e-mail inválido aponta o campo");

    for (let i = 0; i < 3; i++) b.enviar("entrar", { email: "maria@exemplo.com", senha: "errada" + i });
    ok(b.enviar("entrar", { email: "maria@exemplo.com", senha: SENHA }).ok, "senha certa depois de 4 erros ainda entra e zera a contagem");
    for (let i = 0; i < 5; i++) b.enviar("entrar", { email: "maria@exemplo.com", senha: "errada" + i });
    r = b.enviar("entrar", { email: "maria@exemplo.com", senha: SENHA });
    ok(!r.ok && r.erro === "bloqueado", "depois de 5 senhas erradas seguidas, nem a certa entra por 15 minutos");
    b.passarMinutos(16);
    ok(b.enviar("entrar", { email: "maria@exemplo.com", senha: SENHA }).ok, "16 minutos depois, a senha certa entra de novo");

    // A sessão vence depois de 6 horas sem uso; cada uso renova
    b.passarMinutos(5 * 60);
    ok(b.enviar("painel", { token }).ok, "sessão usada depois de 5 horas continua valendo");
    b.passarMinutos(5 * 60);
    ok(b.enviar("painel", { token }).ok, "o uso renova a sessão por mais 6 horas");
    b.passarMinutos(6 * 60 + 1);
    ok(b.enviar("painel", { token }).erro === "sessao", "sessão parada por mais de 6 horas vence");

    const outro = b.enviar("entrar", { email: "maria@exemplo.com", senha: SENHA }).token;
    ok(b.enviar("sair", { token: outro }).ok && b.enviar("painel", { token: outro }).erro === "sessao", "sair encerra a sessão");

    // Sem o segredo das senhas, nenhuma senha confere, e o banco não quebra
    delete b.props.SEGREDO_SENHAS;
    r = b.enviar("entrar", { email: "maria@exemplo.com", senha: SENHA });
    ok(!r.ok && r.erro === "credenciais", "sem o segredo das senhas, a entrada é recusada sem erro interno");
  }

  // Criar ou recuperar a senha com código por e-mail
  {
    const b = criarBanco();
    b.api.configurar();
    b.inscrever();
    const enviados = b.emails.length;
    let r = b.enviar("pedirCodigo", { email: "ninguem@exemplo.com" });
    const generica = r.mensagem;
    ok(r.ok && b.emails.length === enviados, "pedir código para e-mail sem inscrição responde igual e não manda e-mail");
    r = b.enviar("pedirCodigo", { email: "Maria@Exemplo.com" });
    const codigo = b.ultimoCodigo();
    ok(r.ok && r.mensagem === generica && b.emails.length === enviados + 1 && /^\d{6}$/.test(codigo), "pedir código para e-mail inscrito manda um código de 6 números");
    ok(b.emails[b.emails.length - 1].to === "maria@exemplo.com" && b.emails[b.emails.length - 1].subject.startsWith("Código"), "o código vai para o e-mail da inscrição");

    const errado = codigo === "000000" ? "111111" : "000000";
    r = b.enviar("novaSenha", { email: "maria@exemplo.com", codigo: errado, senha: "nova senha 123" });
    ok(!r.ok && r.campo === "codigo", "código errado é recusado");
    r = b.enviar("novaSenha", { email: "maria@exemplo.com", codigo, senha: "curta" });
    ok(!r.ok && r.campo === "senha", "nova senha curta é recusada");
    r = b.enviar("novaSenha", { email: "maria@exemplo.com", codigo, senha: "nova senha 123" });
    ok(r.ok && /^[0-9a-f]{64}$/.test(r.token) && b.enviar("painel", { token: r.token }).ok, "código certo troca a senha e já entra");
    ok(!b.enviar("entrar", { email: "maria@exemplo.com", senha: SENHA }).ok && b.enviar("entrar", { email: "maria@exemplo.com", senha: "nova senha 123" }).ok, "depois da troca, só a senha nova entra");
    ok(b.aba("Acessos").dados.length === 2, "trocar a senha não duplica o acesso");
    r = b.enviar("novaSenha", { email: "maria@exemplo.com", codigo, senha: "outra senha 456" });
    ok(!r.ok && r.erro === "codigo_vencido", "cada código vale uma vez só");

    // Cinco erros invalidam o código
    b.enviar("pedirCodigo", { email: "maria@exemplo.com" });
    const c2 = b.ultimoCodigo();
    const outroErrado = c2 === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) b.enviar("novaSenha", { email: "maria@exemplo.com", codigo: outroErrado, senha: "outra senha 456" });
    r = b.enviar("novaSenha", { email: "maria@exemplo.com", codigo: c2, senha: "outra senha 456" });
    ok(!r.ok && r.erro === "codigo_vencido", "depois de 5 tentativas erradas, o código deixa de valer");

    // Limite de códigos por hora e validade de 30 minutos
    b.enviar("pedirCodigo", { email: "maria@exemplo.com" });
    r = b.enviar("pedirCodigo", { email: "maria@exemplo.com" });
    ok(!r.ok && r.erro === "muitos_codigos", "o quarto pedido de código na mesma hora é recusado");
    const c3 = b.ultimoCodigo();
    b.passarMinutos(31);
    r = b.enviar("novaSenha", { email: "maria@exemplo.com", codigo: c3, senha: "outra senha 456" });
    ok(!r.ok && r.erro === "codigo_vencido", "código com mais de 30 minutos não vale");
    b.passarMinutos(60);
    ok(b.enviar("pedirCodigo", { email: "maria@exemplo.com" }).ok, "uma hora depois, dá para pedir código de novo");

    // Inscrição feita antes da área do inscrito, sem senha: cria a senha pelo código
    b.enviar("inscricao", inscricao({ nome: "João Souza", cpf: CPFS[1], email: "joao@exemplo.com", senha: "senha do João" }));
    b.aba("Acessos").dados = b.aba("Acessos").dados.filter((l) => l[0] !== "joao@exemplo.com");
    ok(!b.enviar("entrar", { email: "joao@exemplo.com", senha: "senha do João" }).ok, "inscrição sem acesso não entra");
    b.enviar("pedirCodigo", { email: "joao@exemplo.com" });
    r = b.enviar("novaSenha", { email: "joao@exemplo.com", codigo: b.ultimoCodigo(), senha: "senha nova do João" });
    ok(r.ok && b.enviar("painel", { token: r.token }).inscricao.cpf === "111.444.777-35", "quem se inscreveu sem senha cria a senha pelo código e entra na própria inscrição");

    // Nova senha também libera o bloqueio por erros
    for (let i = 0; i < 5; i++) b.enviar("entrar", { email: "joao@exemplo.com", senha: "errada" + i });
    b.passarMinutos(61);
    b.enviar("pedirCodigo", { email: "joao@exemplo.com" });
    b.enviar("novaSenha", { email: "joao@exemplo.com", codigo: b.ultimoCodigo(), senha: "mais uma senha" });
    ok(b.enviar("entrar", { email: "joao@exemplo.com", senha: "mais uma senha" }).ok, "criar senha nova desfaz o bloqueio por senhas erradas");
  }

  // Conferência de coautores: só para quem entrou
  {
    const b = criarBanco();
    b.api.configurar();
    const token = b.inscrever();
    const linhasAntes = JSON.stringify(b.planilha.folhas);
    const emailsAntes = b.emails.length;
    let r = b.enviar("conferir", { cpf: "52998224725", email: " Maria@Exemplo.com " });
    ok(!r.ok && r.erro === "sessao" && !r.nome, "conferir sem sessão é recusado e não mostra nada");
    r = b.enviar("conferir", { token, cpf: "52998224725", email: " Maria@Exemplo.com " });
    ok(r.ok && r.nome === "Maria da Silva" && r.instituicao === "Hospital Municipal Souza Aguiar", "conferir com CPF e e-mail certos devolve nome e instituição");
    ok(!("cpf" in r) && !("email" in r) && !("celular" in r), "conferir não devolve CPF, e-mail nem celular");
    r = b.enviar("conferir", { token, cpf: CPFS[0], email: "outra@exemplo.com" });
    ok(!r.ok && r.erro === "email_diferente" && r.campo === "email" && !r.nome, "conferir com e-mail diferente aponta o e-mail e não mostra o nome");
    r = b.enviar("conferir", { token, cpf: CPFS[1], email: "maria@exemplo.com" });
    ok(!r.ok && r.erro === "nao_inscrito" && r.campo === "cpf" && !r.nome, "conferir com CPF sem inscrição aponta o CPF e não mostra o nome");
    r = b.enviar("conferir", { token, cpf: "123.456.789-00", email: "maria@exemplo.com" });
    ok(!r.ok && r.campo === "cpf", "conferir com CPF inválido aponta o CPF");
    ok(JSON.stringify(b.planilha.folhas) === linhasAntes && b.emails.length === emailsAntes, "conferir não grava nada nem manda e-mail");
  }

  // Dados dos coautores: nome, CPF e e-mail obrigatórios; instituição opcional
  {
    const b = criarBanco();
    b.api.configurar();
    const token = b.inscrever();
    const casos = [
      [{ cpf: "" }, "coautor sem CPF é recusado"],
      [{ cpf: "123.456.789-00" }, "coautor com CPF inválido é recusado"],
      [{ email: "" }, "coautor sem e-mail é recusado"],
      [{ nome: "Carla" }, "coautor sem sobrenome é recusado"],
      [{ cpf: CPFS[0] }, "coautor com o CPF do primeiro autor é recusado"],
    ];
    casos.forEach(([extra, msg], i) => {
      const r = b.enviar("trabalho", trabalho(token, { titulo: "Caso " + i, coautores: [coautor(2, extra)] }));
      ok(!r.ok && r.campo === "coautores", msg);
    });
    let r = b.enviar("trabalho", trabalho(token, { titulo: "Repetidos", coautores: [coautor(2), coautor(3, { cpf: coautor(2).cpf })] }));
    ok(!r.ok && r.campo === "coautores" && r.mensagem.includes("mesmo CPF"), "dois coautores com o mesmo CPF são recusados");
    r = b.enviar("trabalho", trabalho(token, { titulo: "Sem instituição", coautores: [coautor(2, { instituicao: "" })] }));
    ok(r.ok && !b.aba("Trabalhos").dados[1][8].includes("Unidade"), "coautor sem instituição é aceito");
  }

  // Limite do título: 200 caracteres contando os espaços
  {
    const b = criarBanco();
    b.api.configurar();
    const token = b.inscrever();
    const t201 = "Título " + "x".repeat(194);
    let r = b.enviar("trabalho", trabalho(token, { titulo: t201 }));
    ok(t201.length === 201 && !r.ok && r.campo === "titulo", "título com 201 caracteres é recusado");
    const t200 = "Título " + "x".repeat(193);
    r = b.enviar("trabalho", trabalho(token, { titulo: t200 }));
    ok(t200.length === 200 && r.ok, "título com 200 caracteres é aceito");
  }

  // Prazos, no fuso de Brasília
  {
    const b = criarBanco({ agora: "2026-11-06T23:30:00-03:00" });
    b.api.configurar();
    const token = b.inscrever();
    ok(b.enviar("trabalho", trabalho(token)).ok, "06/11 às 23h30 de Brasília ainda aceita trabalho");
    b.estado.agora = new Date("2026-11-07T00:30:00-03:00");
    const r = b.enviar("trabalho", trabalho(token, { titulo: "Atrasado" }));
    ok(!r.ok && r.erro === "fora_do_prazo", "07/11 às 00h30 de Brasília recusa trabalho");
    ok(b.enviar("painel", { token }).submissao.aberta === false, "depois do prazo, o painel avisa que a submissão fechou");
    b.estado.agora = new Date("2026-10-05T23:30:00-03:00");
    ok(b.enviar("inscricao", inscricao({ cpf: CPFS[1], email: "joao@exemplo.com" })).erro === "fora_do_prazo", "inscrição em 05/10 às 23h30 é recusada");
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

  // Cópia da planilha de testes: mesmas regras, e-mails marcados
  {
    const b = criarBanco();
    b.api.configurar();
    ok(b.api.CONFIG.TESTE === false, "o código sai do repositório com TESTE desligado");
    b.inscrever();
    ok(!b.emails[0].subject.includes("TESTE"), "fora do teste, o assunto do e-mail não leva [TESTE]");
    b.api.CONFIG.TESTE = true;
    ok(JSON.parse(b.api.doGet().getContent()).mensagem.startsWith("Banco de TESTE"), "no teste, doGet avisa que é o banco de teste");
    const r = b.enviar("inscricao", inscricao({ cpf: CPFS[1], email: "joao@exemplo.com" }));
    const m = b.emails[b.emails.length - 1];
    ok(r.ok && r.protocolo === "INS-0002", "no teste, a inscrição segue as mesmas regras e numeração");
    ok(m.subject.startsWith("[TESTE] Inscrição recebida") && m.body.startsWith("Este e-mail veio do ambiente de teste"), "no teste, o e-mail sai com [TESTE] no assunto e aviso no texto");
    b.enviar("trabalho", trabalho(r.token));
    ok(b.emails[b.emails.length - 1].subject.startsWith("[TESTE] Trabalho recebido · TRB-0001"), "no teste, o e-mail do trabalho também sai marcado");
  }

  const falhas = resultados.filter((r) => !r[0]);
  resultados.forEach(([passou, msg]) => console.log((passou ? "ok    " : "FALHA ") + msg));
  console.log("\n" + (resultados.length - falhas.length) + " de " + resultados.length + " verificações passaram.");
  if (falhas.length) process.exitCode = 1;
}

module.exports = { criarBanco };
if (require.main === module) rodar();
