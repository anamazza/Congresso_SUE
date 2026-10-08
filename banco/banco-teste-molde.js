/* =====================================================================
   1º Simpósio de Urgência e Emergência · banco de teste no navegador
   ---------------------------------------------------------------------
   ARQUIVO GERADO por banco/gerar-banco-teste.js a partir de
   banco/banco-teste-molde.js e banco/apps-script.gs. Não edite à mão:
   mude o molde ou o banco e rode  node banco/gerar-banco-teste.js

   Só é carregado quando o site é aberto com ?teste e banco.urlTeste está
   vazio. Roda aqui o mesmo código do banco do Google, com a planilha, o
   cache e os e-mails guardados neste navegador (localStorage). Nada sai
   do computador. O Painel de teste, no canto da tela, mostra os e-mails
   que o banco teria mandado e as abas da planilha.
   ===================================================================== */
(function () {
  "use strict";

  const CHAVE = "simposio-ue-banco-teste";
  const CHAVE_SESSAO_SITE = "simposio-ue-sessao";

  // ---------- Dados guardados neste navegador ----------
  // Datas viram {"$data": "..."} no armazenamento e voltam a ser datas ao ler
  function guardarData(chave, valor) {
    const original = this[chave];
    return original instanceof Date ? { $data: original.toISOString() } : valor;
  }
  function lerData(_chave, valor) {
    return valor && typeof valor === "object" && typeof valor.$data === "string" ? new Date(valor.$data) : valor;
  }
  function dadosVazios() {
    return { folhas: {}, props: {}, cache: {}, emails: [] };
  }
  let dados = null;
  try {
    dados = JSON.parse(window.localStorage.getItem(CHAVE) || "null", lerData);
  } catch (erro) {
    dados = null;
  }
  if (!dados || typeof dados !== "object" || !dados.folhas) dados = dadosVazios();
  function salvar() {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(dados, guardarData));
    } catch (erro) {
      // Sem armazenamento: os dados valem até a página ser recarregada
    }
  }

  // ---------- Serviços do Google, imitados ----------
  function Folha(nome) {
    this.nome = nome;
    if (!dados.folhas[nome]) dados.folhas[nome] = [];
  }
  Folha.prototype.linhas = function () { return dados.folhas[this.nome]; };
  Folha.prototype.getName = function () { return this.nome; };
  Folha.prototype.getLastRow = function () { return this.linhas().length; };
  Folha.prototype.appendRow = function (valores) { this.linhas().push(valores.slice()); return this; };
  Folha.prototype.setFrozenRows = function () { return this; };
  Folha.prototype.getRange = function (l, c, nl, nc) { return new Intervalo(this, l, c, nl || 1, nc || 1); };

  function Intervalo(folha, l, c, nl, nc) {
    this.folha = folha; this.l = l; this.c = c; this.nl = nl; this.nc = nc;
  }
  Intervalo.prototype.getValues = function () {
    const linhas = this.folha.linhas();
    const r = [];
    for (let i = 0; i < this.nl; i++) {
      const linha = linhas[this.l - 1 + i] || [];
      const out = [];
      for (let j = 0; j < this.nc; j++) out.push(linha[this.c - 1 + j] === undefined || linha[this.c - 1 + j] === null ? "" : linha[this.c - 1 + j]);
      r.push(out);
    }
    return r;
  };
  Intervalo.prototype.setValues = function (m) {
    const linhas = this.folha.linhas();
    const self = this;
    m.forEach(function (linha, i) {
      const alvo = (linhas[self.l - 1 + i] = linhas[self.l - 1 + i] || []);
      linha.forEach(function (v, j) { alvo[self.c - 1 + j] = v; });
    });
    return this;
  };
  Intervalo.prototype.setValue = function (v) { return this.setValues([[v]]); };
  Intervalo.prototype.setFontWeight = function () { return this; };
  Intervalo.prototype.setBackground = function () { return this; };
  Intervalo.prototype.setFontColor = function () { return this; };

  const planilha = {
    getId: function () { return "planilha-do-navegador"; },
    getName: function () { return "Banco de teste no navegador"; },
    getSheetByName: function (nome) { return dados.folhas[nome] ? new Folha(nome) : null; },
    insertSheet: function (nome) { return new Folha(nome); },
  };

  const SpreadsheetApp = {
    getActiveSpreadsheet: function () { return planilha; },
    openById: function () { return planilha; },
  };
  const PropertiesService = {
    getScriptProperties: function () {
      return {
        getProperty: function (k) { return Object.prototype.hasOwnProperty.call(dados.props, k) ? dados.props[k] : null; },
        setProperty: function (k, v) { dados.props[k] = String(v); },
      };
    },
  };
  const LockService = {
    getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; },
  };
  const CacheService = {
    getScriptCache: function () {
      return {
        get: function (k) {
          const e = dados.cache[k];
          if (!e) return null;
          if (e.expira <= Date.now()) {
            delete dados.cache[k];
            return null;
          }
          return e.valor;
        },
        put: function (k, v, segundos) { dados.cache[k] = { valor: String(v), expira: Date.now() + (segundos || 600) * 1000 }; },
        remove: function (k) { delete dados.cache[k]; },
      };
    },
  };
  const ContentService = {
    MimeType: { JSON: "application/json" },
    createTextOutput: function (texto) {
      return { setMimeType: function () { return this; }, getContent: function () { return texto; } };
    },
  };
  const MailApp = {
    getRemainingDailyQuota: function () { return 100; },
    sendEmail: function (m) {
      dados.emails.push({ para: m.to, assunto: m.subject, texto: m.body, quando: new Date() });
    },
  };

  // SHA-256 e HMAC-SHA-256 escritos aqui, porque o Apps Script é síncrono
  // e a criptografia do navegador não é
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  function girar(x, n) { return (x >>> n) | (x << (32 - n)); }
  function sha256(bytes) {
    const tamanho = bytes.length;
    const bloco = new Uint8Array(((tamanho + 9 + 63) >> 6) << 6);
    bloco.set(bytes);
    bloco[tamanho] = 0x80;
    const dv = new DataView(bloco.buffer);
    const bits = tamanho * 8;
    dv.setUint32(bloco.length - 8, Math.floor(bits / 0x100000000));
    dv.setUint32(bloco.length - 4, bits >>> 0);
    const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Uint32Array(64);
    for (let i = 0; i < bloco.length; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
      for (let t = 16; t < 64; t++) {
        const s0 = girar(w[t - 15], 7) ^ girar(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = girar(w[t - 2], 17) ^ girar(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], x = h[7];
      for (let t = 0; t < 64; t++) {
        const t1 = (x + (girar(e, 6) ^ girar(e, 11) ^ girar(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) >>> 0;
        const t2 = ((girar(a, 2) ^ girar(a, 13) ^ girar(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        x = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + x) >>> 0;
    }
    const saida = new Uint8Array(32);
    const dvs = new DataView(saida.buffer);
    h.forEach(function (v, i) { dvs.setUint32(i * 4, v); });
    return saida;
  }
  function hmacSha256(chave, mensagem) {
    if (chave.length > 64) chave = sha256(chave);
    const k = new Uint8Array(64);
    k.set(chave);
    const interno = new Uint8Array(64 + mensagem.length);
    const externo = new Uint8Array(64 + 32);
    for (let i = 0; i < 64; i++) {
      interno[i] = k[i] ^ 0x36;
      externo[i] = k[i] ^ 0x5c;
    }
    interno.set(mensagem, 64);
    externo.set(sha256(interno), 64);
    return sha256(externo);
  }
  function utf8(texto) { return new TextEncoder().encode(String(texto)); }
  function comSinal(bytes) { return Array.from(bytes, function (b) { return b > 127 ? b - 256 : b; }); }
  function hexDe(bytes) { return Array.from(bytes, function (b) { return (b + 0x100).toString(16).slice(1); }).join(""); }
  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    const b = window.crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const x = hexDe(b);
    return x.slice(0, 8) + "-" + x.slice(8, 12) + "-" + x.slice(12, 16) + "-" + x.slice(16, 20) + "-" + x.slice(20);
  }

  const Utilities = {
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF_8" },
    computeDigest: function (_algoritmo, texto) { return comSinal(sha256(utf8(texto))); },
    computeHmacSha256Signature: function (valor, chave) { return comSinal(hmacSha256(utf8(chave), utf8(valor))); },
    getUuid: uuid,
    formatDate: function (data, fuso, formato) {
      const p = {};
      new Intl.DateTimeFormat("en-CA", {
        timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).formatToParts(data).forEach(function (x) { p[x.type] = x.value; });
      return formato.replace(/yyyy|MM|dd|HH|mm/g, function (t) {
        return { yyyy: p.year, MM: p.month, dd: p.day, HH: p.hour, mm: p.minute }[t];
      });
    },
  };

  // ---------- Código do banco (banco/apps-script.gs) ----------
  /* @@CODIGO_DO_BANCO@@ */
  // ---------- Fim do código do banco ----------

  CONFIG.TESTE = true;
  if (!dados.folhas[ABAS.inscricoes.nome]) configurar();

  // Avaliador de teste, para experimentar a área da comissão
  const AVALIADOR_TESTE = ["comissao@teste.com", "Avaliador de Teste"];
  function garantirAvaliadorDeTeste() {
    const folha = aba(planilha, ABAS.comissao);
    if (folha.getLastRow() < 2) folha.appendRow([AVALIADOR_TESTE[0], AVALIADOR_TESTE[1], "", "", ""]);
  }
  garantirAvaliadorDeTeste();
  salvar();

  window.bancoDeTeste = {
    enviar: function (acao, dadosDoSite) {
      const resposta = JSON.parse(doPost({ postData: { contents: JSON.stringify({ acao: acao, dados: dadosDoSite }) } }).getContent());
      salvar();
      atualizarPainel();
      return resposta;
    },
    // Usados nos testes do repositório para conferir a criptografia
    _resumoHex: function (texto) { return hexDe(sha256(utf8(texto))); },
    _hmacHex: function (valor, chave) { return hexDe(hmacSha256(utf8(chave), utf8(valor))); },
  };

  // ---------- Painel de teste: e-mails, planilha e botão de apagar ----------
  let caixaPainel = null;
  let abaAtual = "emails";

  function montarPainel() {
    const estilo = document.createElement("style");
    estilo.textContent = [
      ".teste-painel__abrir{position:fixed;right:16px;bottom:16px;z-index:60;padding:.7rem 1rem;border:0;border-radius:999px;",
      "background:#0078A0;color:#fff;font:700 .9rem/1.2 system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:pointer}",
      ".teste-painel{position:fixed;right:16px;bottom:72px;z-index:61;width:min(34rem,calc(100vw - 32px));max-height:min(70vh,40rem);",
      "display:flex;flex-direction:column;background:#fff;color:#2B3140;border:1px solid #B9DCE9;border-top:4px solid #0078A0;",
      "border-radius:8px;box-shadow:0 12px 32px rgba(0,0,0,.25);font:400 .9rem/1.45 system-ui,sans-serif}",
      ".teste-painel[hidden]{display:none}",
      ".teste-painel__topo{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.75rem 1rem .25rem}",
      ".teste-painel__topo strong{font-size:1rem}",
      ".teste-painel__fechar{border:0;background:none;font-size:1.4rem;line-height:1;cursor:pointer;color:#5E6675}",
      ".teste-painel__nota{margin:0;padding:0 1rem .5rem;color:#5E6675;font-size:.82rem}",
      ".teste-painel__abas{display:flex;gap:.25rem;padding:0 1rem;border-bottom:1px solid #DDE3EA}",
      ".teste-painel__abas button{border:0;background:none;padding:.5rem .75rem;font:600 .85rem system-ui,sans-serif;color:#5E6675;cursor:pointer;border-bottom:3px solid transparent}",
      ".teste-painel__abas button[aria-selected=true]{color:#005C7B;border-bottom-color:#0078A0}",
      ".teste-painel__corpo{overflow:auto;padding:.75rem 1rem;flex:1}",
      ".teste-painel__email{padding:.6rem .75rem;margin:0 0 .6rem;background:#F4F6F9;border-radius:6px}",
      ".teste-painel__email p{margin:0}",
      ".teste-painel__email pre{margin:.4rem 0 0;white-space:pre-wrap;font:inherit;color:#2B3140}",
      ".teste-painel__meta{color:#5E6675;font-size:.8rem}",
      ".teste-painel h4{margin:.5rem 0 .35rem;font-size:.9rem}",
      ".teste-painel__tabela{overflow-x:auto;margin-bottom:.75rem;border:1px solid #DDE3EA;border-radius:4px}",
      ".teste-painel table{border-collapse:collapse;font-size:.78rem;min-width:100%}",
      ".teste-painel th,.teste-painel td{border:1px solid #DDE3EA;padding:.3rem .5rem;text-align:left;vertical-align:top;",
      "white-space:nowrap;max-width:16rem;overflow:hidden;text-overflow:ellipsis}",
      ".teste-painel th{background:#F4F6F9}",
      ".teste-painel__vazio{color:#5E6675;margin:0}",
      ".teste-painel__rodape{padding:.6rem 1rem;border-top:1px solid #DDE3EA}",
      ".teste-painel__form{display:flex;flex-wrap:wrap;gap:.4rem;margin:.75rem 0 .25rem}",
      ".teste-painel__form input{flex:1 1 10rem;min-width:0;padding:.4rem .5rem;border:1px solid #B8C2CE;border-radius:4px;font:inherit}",
      ".teste-painel__form button{padding:.4rem .8rem;border:0;border-radius:4px;background:#0078A0;color:#fff;font:600 .85rem system-ui,sans-serif;cursor:pointer}",
      ".teste-painel ul{margin:.25rem 0 .5rem;padding-left:1.1rem}",
      ".teste-painel__apagar{border:1px solid #880A12;background:#fff;color:#880A12;border-radius:6px;padding:.45rem .8rem;font:600 .85rem system-ui,sans-serif;cursor:pointer}",
    ].join("");
    document.head.appendChild(estilo);

    const abrir = document.createElement("button");
    abrir.type = "button";
    abrir.className = "teste-painel__abrir";
    abrir.setAttribute("aria-expanded", "false");

    caixaPainel = document.createElement("div");
    caixaPainel.className = "teste-painel";
    caixaPainel.hidden = true;
    caixaPainel.setAttribute("role", "dialog");
    caixaPainel.setAttribute("aria-label", "Painel de teste");
    caixaPainel.innerHTML =
      '<div class="teste-painel__topo"><strong>Painel de teste</strong>' +
      '<button type="button" class="teste-painel__fechar" aria-label="Fechar o painel">×</button></div>' +
      '<p class="teste-painel__nota">O banco de teste roda neste navegador. Os dados ficam só aqui e não vão para lugar nenhum.</p>' +
      '<div class="teste-painel__abas" role="tablist">' +
      '<button type="button" role="tab" data-aba="emails">E-mails enviados</button>' +
      '<button type="button" role="tab" data-aba="planilha">Planilha</button>' +
      '<button type="button" role="tab" data-aba="comissao">Comissão</button></div>' +
      '<div class="teste-painel__corpo"></div>' +
      '<div class="teste-painel__rodape"><button type="button" class="teste-painel__apagar">Apagar todos os dados de teste</button></div>';
    document.body.appendChild(caixaPainel);
    document.body.appendChild(abrir);

    abrir.addEventListener("click", function () {
      caixaPainel.hidden = !caixaPainel.hidden;
      abrir.setAttribute("aria-expanded", String(!caixaPainel.hidden));
      atualizarPainel();
    });
    caixaPainel.querySelector(".teste-painel__fechar").addEventListener("click", function () {
      caixaPainel.hidden = true;
      abrir.setAttribute("aria-expanded", "false");
      abrir.focus();
    });
    caixaPainel.querySelectorAll("[data-aba]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        abaAtual = botao.dataset.aba;
        atualizarPainel();
      });
    });
    caixaPainel.querySelector(".teste-painel__apagar").addEventListener("click", function () {
      if (!window.confirm("Apagar todas as inscrições, trabalhos, senhas e e-mails de teste deste navegador?")) return;
      dados = dadosVazios();
      configurar();
      garantirAvaliadorDeTeste();
      salvar();
      try {
        window.sessionStorage.removeItem(CHAVE_SESSAO_SITE);
      } catch (erro) {
        // nada a apagar
      }
      window.location.reload();
    });
    atualizarPainel();
  }

  function textoPainel(texto) {
    const p = document.createElement("p");
    p.className = "teste-painel__vazio";
    p.textContent = texto;
    return p;
  }

  function celula(valor) {
    if (valor instanceof Date) return Utilities.formatDate(valor, CONFIG.FUSO, "dd/MM/yyyy HH:mm");
    const texto = String(valor === undefined || valor === null ? "" : valor);
    return texto.length > 90 ? texto.slice(0, 90) + "…" : texto;
  }

  function atualizarPainel() {
    if (!caixaPainel) return;
    const abrir = document.querySelector(".teste-painel__abrir");
    abrir.textContent = "Painel de teste · " + dados.emails.length + (dados.emails.length === 1 ? " e-mail" : " e-mails");
    caixaPainel.querySelectorAll("[data-aba]").forEach(function (b) {
      b.setAttribute("aria-selected", String(b.dataset.aba === abaAtual));
    });
    if (caixaPainel.hidden) return;
    const corpo = caixaPainel.querySelector(".teste-painel__corpo");
    corpo.textContent = "";

    if (abaAtual === "emails") {
      if (!dados.emails.length) {
        const vazio = document.createElement("p");
        vazio.className = "teste-painel__vazio";
        vazio.textContent = "Nenhum e-mail ainda. Os e-mails de confirmação e os códigos de senha aparecem aqui.";
        corpo.appendChild(vazio);
      }
      dados.emails.slice().reverse().forEach(function (m) {
        const caixa = document.createElement("div");
        caixa.className = "teste-painel__email";
        const meta = document.createElement("p");
        meta.className = "teste-painel__meta";
        meta.textContent = "Para " + m.para + " · " + celula(m.quando);
        const assunto = document.createElement("p");
        const forte = document.createElement("strong");
        forte.textContent = m.assunto;
        assunto.appendChild(forte);
        const texto = document.createElement("pre");
        texto.textContent = m.texto;
        caixa.appendChild(meta);
        caixa.appendChild(assunto);
        caixa.appendChild(texto);
        corpo.appendChild(caixa);
      });
      return;
    }

    if (abaAtual === "comissao") {
      corpo.appendChild(textoPainel("Para testar a área da comissão, abra a página Área da comissão (link no rodapé) com um destes e-mails. No primeiro acesso, use \"Primeiro acesso ou esqueci a senha\": o código aparece em E-mails enviados."));
      const lista = document.createElement("ul");
      (dados.folhas[ABAS.comissao.nome] || []).slice(1).forEach(function (l) {
        const li = document.createElement("li");
        li.textContent = l[0] + " · " + (l[1] || "sem nome") + " · " + (l[2] ? "senha criada" : "sem senha ainda");
        lista.appendChild(li);
      });
      corpo.appendChild(lista);
      const form = document.createElement("form");
      form.className = "teste-painel__form";
      form.innerHTML = '<input type="email" placeholder="E-mail do avaliador" aria-label="E-mail do avaliador" required>' +
        '<input type="text" placeholder="Nome" aria-label="Nome do avaliador">' +
        '<button type="submit">Adicionar avaliador</button>';
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        const email = form.elements[0].value.trim().toLowerCase();
        if (!emailValido(email)) return form.elements[0].focus();
        if (!buscarAvaliador(planilha, email)) aba(planilha, ABAS.comissao).appendRow([email, form.elements[1].value.trim(), "", "", ""]);
        salvar();
        atualizarPainel();
      });
      corpo.appendChild(form);
      return;
    }

    Object.keys(ABAS).forEach(function (chave) {
      const linhas = dados.folhas[ABAS[chave].nome] || [];
      const titulo = document.createElement("h4");
      titulo.textContent = "Aba " + ABAS[chave].nome + " · " + Math.max(0, linhas.length - 1) + (linhas.length === 2 ? " linha" : " linhas");
      corpo.appendChild(titulo);
      if (linhas.length < 2) return;
      const tabela = document.createElement("table");
      linhas.forEach(function (linha, i) {
        const tr = document.createElement("tr");
        linha.forEach(function (v) {
          const td = document.createElement(i === 0 ? "th" : "td");
          td.textContent = celula(v);
          if (i > 0) td.title = v instanceof Date ? td.textContent : String(v === undefined || v === null ? "" : v);
          tr.appendChild(td);
        });
        tabela.appendChild(tr);
      });
      const rolagem = document.createElement("div");
      rolagem.className = "teste-painel__tabela";
      rolagem.appendChild(tabela);
      corpo.appendChild(rolagem);
    });
  }

  if (document.body) montarPainel();
  else document.addEventListener("DOMContentLoaded", montarPainel);
})();
