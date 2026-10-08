/* =====================================================================
   Repositório SQLite: o banco de dados do servidor, num arquivo só.
   Usa o SQLite que vem com o Node (node:sqlite), sem programas extras.
   Para fazer cópia de segurança, basta copiar o arquivo do banco.
   ===================================================================== */
"use strict";

const { DatabaseSync } = require("node:sqlite");

// Nome do campo no programa → coluna na tabela
const TABELAS = {
  inscricoes: {
    chave: "protocolo",
    ordem: "protocolo",
    campos: {
      protocolo: "protocolo", criadoEm: "criado_em", nome: "nome", cpf: "cpf", email: "email",
      celular: "celular", categoria: "categoria", instituicao: "instituicao", intencao: "intencao",
      emailConfirmacao: "email_confirmacao",
    },
  },
  trabalhos: {
    chave: "protocolo",
    ordem: "protocolo",
    json: ["coautores"],
    campos: {
      protocolo: "protocolo", criadoEm: "criado_em", titulo: "titulo", tipo: "tipo", eixo: "eixo",
      autorNome: "autor_nome", autorCpf: "autor_cpf", autorEmail: "autor_email", coautores: "coautores",
      totalAutores: "total_autores", apresentadorNome: "apresentador_nome", apresentadorCpf: "apresentador_cpf",
      introducao: "introducao", metodos: "metodos", resultados: "resultados", conclusoes: "conclusoes",
      caracteres: "caracteres", emailConfirmacao: "email_confirmacao", situacao: "situacao",
      avaliadorNome: "avaliador_nome", avaliadorEmail: "avaliador_email", avaliadoEm: "avaliado_em",
      comentario: "comentario", emailResultado: "email_resultado",
    },
  },
  contas: {
    chave: "email",
    ordem: "criada_em",
    logicos: ["verificada", "comissao"],
    campos: {
      email: "email", nome: "nome", cpf: "cpf", senha: "senha", verificada: "verificada", comissao: "comissao",
      criadaEm: "criada_em", atualizadaEm: "atualizada_em", convidadoEm: "convidado_em",
    },
  },
};

const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS inscricoes (
    protocolo TEXT PRIMARY KEY, criado_em TEXT NOT NULL, nome TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, celular TEXT, categoria TEXT,
    instituicao TEXT, intencao TEXT, email_confirmacao TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS trabalhos (
    protocolo TEXT PRIMARY KEY, criado_em TEXT NOT NULL, titulo TEXT NOT NULL, tipo TEXT, eixo TEXT,
    autor_nome TEXT, autor_cpf TEXT NOT NULL, autor_email TEXT, coautores TEXT DEFAULT '[]',
    total_autores INTEGER, apresentador_nome TEXT, apresentador_cpf TEXT,
    introducao TEXT, metodos TEXT, resultados TEXT, conclusoes TEXT, caracteres INTEGER,
    email_confirmacao TEXT DEFAULT '', situacao TEXT NOT NULL DEFAULT 'Em avaliação',
    avaliador_nome TEXT DEFAULT '', avaliador_email TEXT DEFAULT '', avaliado_em TEXT DEFAULT '',
    comentario TEXT DEFAULT '', email_resultado TEXT DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS trabalhos_autor ON trabalhos (autor_cpf);
  CREATE TABLE IF NOT EXISTS contas (
    email TEXT PRIMARY KEY, nome TEXT DEFAULT '', cpf TEXT DEFAULT '', senha TEXT DEFAULT '',
    verificada INTEGER NOT NULL DEFAULT 0, comissao INTEGER NOT NULL DEFAULT 0,
    criada_em TEXT, atualizada_em TEXT, convidado_em TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS cache (chave TEXT PRIMARY KEY, valor TEXT NOT NULL, expira INTEGER NOT NULL);
`;

function criarRepoSqlite(opcoes) {
  const agora = opcoes.agora || function () { return new Date(); };
  const db = new DatabaseSync(opcoes.arquivo);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  db.exec(ESQUEMA);
  let emTransacao = false;

  function paraObjeto(nome, linha) {
    if (!linha) return null;
    const t = TABELAS[nome];
    const obj = {};
    Object.keys(t.campos).forEach(function (campo) {
      let v = linha[t.campos[campo]];
      if (t.json && t.json.indexOf(campo) >= 0) v = JSON.parse(v || "[]");
      else if (t.logicos && t.logicos.indexOf(campo) >= 0) v = !!v;
      else if (v === null || v === undefined) v = "";
      obj[campo] = v;
    });
    return obj;
  }

  function paraColunas(nome, obj) {
    const t = TABELAS[nome];
    const colunas = [];
    const valores = [];
    Object.keys(obj).forEach(function (campo) {
      if (!t.campos[campo]) return;
      let v = obj[campo];
      if (t.json && t.json.indexOf(campo) >= 0) v = JSON.stringify(v || []);
      else if (t.logicos && t.logicos.indexOf(campo) >= 0) v = v ? 1 : 0;
      else if (v === undefined || v === null) v = "";
      colunas.push(t.campos[campo]);
      valores.push(v);
    });
    return { colunas: colunas, valores: valores };
  }

  function tabela(nome) {
    const t = TABELAS[nome];
    return {
      listar: function () {
        return db.prepare("SELECT * FROM " + nome + " ORDER BY " + t.ordem).all().map(function (l) { return paraObjeto(nome, l); });
      },
      buscar: function (campo, valor) {
        return paraObjeto(nome, db.prepare("SELECT * FROM " + nome + " WHERE " + t.campos[campo] + " = ?").get(valor));
      },
      inserir: function (obj) {
        const c = paraColunas(nome, obj);
        db.prepare("INSERT INTO " + nome + " (" + c.colunas.join(", ") + ") VALUES (" + c.colunas.map(function () { return "?"; }).join(", ") + ")")
          .run(...c.valores);
      },
      atualizar: function (valorChave, campos) {
        const c = paraColunas(nome, campos);
        if (!c.colunas.length) return;
        db.prepare("UPDATE " + nome + " SET " + c.colunas.map(function (col) { return col + " = ?"; }).join(", ") + " WHERE " + t.campos[t.chave] + " = ?")
          .run(...c.valores, valorChave);
      },
      remover: function (valorChave) {
        db.prepare("DELETE FROM " + nome + " WHERE " + t.campos[t.chave] + " = ?").run(valorChave);
      },
    };
  }
  const inscricoes = tabela("inscricoes");
  const trabalhos = tabela("trabalhos");
  const contas = tabela("contas");

  return {
    db: db,
    // Tudo dentro de fn grava junto ou nada grava
    atomico: function (fn) {
      if (emTransacao) return fn();
      db.exec("BEGIN IMMEDIATE");
      emTransacao = true;
      try {
        const resultado = fn();
        db.exec("COMMIT");
        return resultado;
      } catch (erro) {
        db.exec("ROLLBACK");
        throw erro;
      } finally {
        emTransacao = false;
      }
    },
    inscricoes: {
      listar: inscricoes.listar,
      porCpf: function (cpf) { return inscricoes.buscar("cpf", cpf); },
      porEmail: function (email) { return inscricoes.buscar("email", email); },
      inserir: inscricoes.inserir,
      atualizar: inscricoes.atualizar,
    },
    trabalhos: {
      listar: trabalhos.listar,
      porProtocolo: function (p) { return trabalhos.buscar("protocolo", p); },
      inserir: trabalhos.inserir,
      atualizar: trabalhos.atualizar,
    },
    contas: {
      listar: contas.listar,
      porEmail: function (email) { return contas.buscar("email", email); },
      salvar: function (conta) {
        if (contas.buscar("email", conta.email)) contas.atualizar(conta.email, conta);
        else contas.inserir(conta);
      },
      remover: contas.remover,
    },
    cache: {
      get: function (chave) {
        const linha = db.prepare("SELECT valor, expira FROM cache WHERE chave = ?").get(chave);
        if (!linha) return null;
        if (linha.expira <= agora().getTime()) {
          db.prepare("DELETE FROM cache WHERE chave = ?").run(chave);
          return null;
        }
        return linha.valor;
      },
      put: function (chave, valor, segundos) {
        const momento = agora().getTime();
        db.prepare("INSERT INTO cache (chave, valor, expira) VALUES (?, ?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, expira = excluded.expira")
          .run(chave, String(valor), momento + segundos * 1000);
        // De vez em quando, limpa o que já venceu
        if (Math.random() < 0.02) db.prepare("DELETE FROM cache WHERE expira <= ?").run(momento);
      },
      remove: function (chave) {
        db.prepare("DELETE FROM cache WHERE chave = ?").run(chave);
      },
    },
    fechar: function () { db.close(); },
  };
}

module.exports = { criarRepoSqlite: criarRepoSqlite };
