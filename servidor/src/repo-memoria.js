/* =====================================================================
   Repositório em memória: guarda inscrições, trabalhos, contas e o cache
   (sessões, códigos e limites) num objeto. Usado nos testes e no banco de
   teste do navegador, que salva o objeto no localStorage a cada mudança.
   ===================================================================== */
(function (raiz) {
  "use strict";

  function criarRepoMemoria(opcoes) {
    opcoes = opcoes || {};
    const agora = opcoes.agora || function () { return new Date(); };
    const aoMudar = opcoes.aoMudar || function () {};
    const dados = opcoes.dados || {};
    ["inscricoes", "trabalhos", "contas"].forEach(function (t) { if (!Array.isArray(dados[t])) dados[t] = []; });
    if (!dados.cache || typeof dados.cache !== "object") dados.cache = {};

    function copia(o) {
      return o ? JSON.parse(JSON.stringify(o)) : null;
    }
    function tabela(nome, chave) {
      return {
        listar: function () { return dados[nome].map(copia); },
        buscar: function (campo, valor) {
          return copia(dados[nome].filter(function (r) { return r[campo] === valor; })[0] || null);
        },
        inserir: function (obj) {
          dados[nome].push(copia(obj));
          aoMudar();
        },
        atualizar: function (valorChave, campos) {
          const alvo = dados[nome].filter(function (r) { return r[chave] === valorChave; })[0];
          if (alvo) Object.assign(alvo, copia(campos));
          aoMudar();
        },
        remover: function (valorChave) {
          dados[nome] = dados[nome].filter(function (r) { return r[chave] !== valorChave; });
          aoMudar();
        },
      };
    }
    const inscricoes = tabela("inscricoes", "protocolo");
    const trabalhos = tabela("trabalhos", "protocolo");
    const contas = tabela("contas", "email");

    return {
      dados: dados,
      // Em memória tudo já roda de uma vez só; basta executar
      atomico: function (fn) { return fn(); },
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
          const e = dados.cache[chave];
          if (!e) return null;
          if (e.expira <= agora().getTime()) {
            delete dados.cache[chave];
            aoMudar();
            return null;
          }
          return e.valor;
        },
        put: function (chave, valor, segundos) {
          dados.cache[chave] = { valor: String(valor), expira: agora().getTime() + segundos * 1000 };
          aoMudar();
        },
        remove: function (chave) {
          delete dados.cache[chave];
          aoMudar();
        },
      },
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { criarRepoMemoria: criarRepoMemoria };
  else raiz.criarRepoMemoria = criarRepoMemoria;
})(typeof globalThis !== "undefined" ? globalThis : this);
