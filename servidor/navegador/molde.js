/* =====================================================================
   1º Simpósio de Urgência e Emergência · banco de teste no navegador
   ---------------------------------------------------------------------
   ARQUIVO GERADO por servidor/navegador/gerar.js a partir deste molde e
   de servidor/src/regras.js e repo-memoria.js. Não edite à mão: mude os
   originais e rode  node servidor/navegador/gerar.js

   Só é carregado no modo de teste do site (?teste ou a cópia do GitHub
   Pages). Roda aqui as mesmas regras do servidor, com os dados guardados
   neste navegador (localStorage). Nada sai do computador. O Painel de
   teste, no canto da tela, mostra os e-mails que o sistema mandaria, os
   dados gravados e os acessos de teste.
   ===================================================================== */
(function () {
  "use strict";

  /* @@REGRAS@@ */

  /* @@REPO_MEMORIA@@ */

  const Regras = (typeof globalThis !== "undefined" ? globalThis : window).RegrasDoSimposio;
  const criarRepoMemoria = (typeof globalThis !== "undefined" ? globalThis : window).criarRepoMemoria;

  const CHAVE = "simposio-ue-banco-teste-v2";
  const CHAVE_SESSAO_SITE = "simposio-ue-sessao";
  const ORGANIZACAO_TESTE = "organizacao@teste.com";

  // ---------- Dados guardados neste navegador ----------
  function dadosVazios() {
    return { repo: {}, emails: [], segredo: "" };
  }
  let dados = null;
  try {
    dados = JSON.parse(window.localStorage.getItem(CHAVE) || "null");
  } catch (erro) {
    dados = null;
  }
  if (!dados || typeof dados !== "object" || !dados.repo) dados = dadosVazios();
  function salvar() {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(dados));
    } catch (erro) {
      // Sem armazenamento: os dados valem até a página ser recarregada
    }
  }

  // SHA-256 e HMAC-SHA-256 escritos aqui, porque as regras pedem as senhas
  // de forma síncrona e a criptografia do navegador (crypto.subtle) não é
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
  function utf8(texto) { return new TextEncoder().encode(String(texto)); }
  function hexDe(bytes) { return Array.from(bytes, function (b) { return (b + 0x100).toString(16).slice(1); }).join(""); }
  function aleatorio(n) { return hexDe(window.crypto.getRandomValues(new Uint8Array(n))); }
  function resumo(texto) { return hexDe(sha256(utf8(texto))); }

  // Senhas do teste: 500 rodadas de HMAC-SHA-256 com sal e um segredo deste navegador.
  // O servidor usa scrypt; aqui basta algo síncrono e que não guarde a senha.
  if (!dados.segredo) dados.segredo = aleatorio(32);
  const senhas = {
    proteger: function (senha) {
      const sal = aleatorio(16);
      return "hmac$500$" + sal + "$" + rodadas(senha, sal, 500);
    },
    confere: function (senha, guardada) {
      const p = String(guardada || "").split("$");
      return p.length === 4 && p[0] === "hmac" && rodadas(senha, p[2], Number(p[1])) === p[3];
    },
  };
  function rodadas(senha, sal, n) {
    let h = sal + ":" + senha;
    for (let i = 0; i < n; i++) h = hexDe(hmacSha256(utf8(dados.segredo), utf8(h)));
    return h;
  }

  let banco = null;
  function montarBanco() {
    const repo = criarRepoMemoria({ dados: dados.repo, aoMudar: salvar });
    banco = Regras.criarBanco({
      repo: repo,
      senhas: senhas,
      aleatorio: aleatorio,
      resumo: resumo,
      email: {
        enviar: async function (m) {
          dados.emails.push({ para: m.para, assunto: m.assunto, texto: m.texto, quando: new Date().toISOString() });
          salvar();
          atualizarPainel();
          return "enviado";
        },
      },
      config: {
        TESTE: true,
        ORGANIZACAO: [ORGANIZACAO_TESTE],
        SITE: window.location.href.split("#")[0],
      },
      log: function (erro) { console.error(erro); },
    });
  }
  montarBanco();
  salvar();

  window.bancoDeTeste = {
    enviar: function (acao, dadosDoSite) { return banco.tratar(acao, dadosDoSite); },
    // Usados nos testes do repositório para conferir a criptografia
    _resumoHex: function (texto) { return resumo(texto); },
    _hmacHex: function (valor, chave) { return hexDe(hmacSha256(utf8(chave), utf8(valor))); },
  };

  // ---------- Painel de teste: e-mails, dados e acessos ----------
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
      ".teste-painel__email a{color:#005C7B;overflow-wrap:anywhere}",
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
      '<p class="teste-painel__nota">O sistema de teste roda neste navegador. Os dados ficam só aqui e não vão para lugar nenhum.</p>' +
      '<div class="teste-painel__abas" role="tablist">' +
      '<button type="button" role="tab" data-aba="emails">E-mails enviados</button>' +
      '<button type="button" role="tab" data-aba="acessos">Acessos de teste</button>' +
      '<button type="button" role="tab" data-aba="dados">Dados</button></div>' +
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
      if (!window.confirm("Apagar todas as inscrições, trabalhos, senhas, convites e e-mails de teste deste navegador?")) return;
      dados = dadosVazios();
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

  function el(tag, texto, classe) {
    const e = document.createElement(tag);
    if (texto) e.textContent = texto;
    if (classe) e.className = classe;
    return e;
  }

  // Texto do e-mail com os endereços clicáveis (como o link do convite)
  function textoComLinks(texto) {
    const pre = el("pre");
    String(texto).split(/(https?:\/\/\S+)/).forEach(function (parte, i) {
      if (i % 2) {
        const a = el("a", parte);
        a.href = parte;
        pre.appendChild(a);
      } else {
        pre.appendChild(document.createTextNode(parte));
      }
    });
    return pre;
  }

  function dataCurta(iso) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso || "") : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  function tabela(titulo, colunas, linhas) {
    const corpo = document.createDocumentFragment();
    corpo.appendChild(el("h4", titulo + " · " + linhas.length + (linhas.length === 1 ? " registro" : " registros")));
    if (!linhas.length) return corpo;
    const t = el("table");
    const cab = el("tr");
    colunas.forEach(function (c) { cab.appendChild(el("th", c[0])); });
    t.appendChild(cab);
    linhas.forEach(function (l) {
      const tr = el("tr");
      colunas.forEach(function (c) {
        let v = l[c[1]];
        if (Array.isArray(v)) v = v.map(function (x) { return x.nome; }).join("; ");
        if (typeof v === "boolean") v = v ? "sim" : "não";
        v = String(v === undefined || v === null ? "" : v);
        const td = el("td", v.length > 90 ? v.slice(0, 90) + "…" : v);
        td.title = v;
        tr.appendChild(td);
      });
      t.appendChild(tr);
    });
    const rolagem = el("div", "", "teste-painel__tabela");
    rolagem.appendChild(t);
    corpo.appendChild(rolagem);
    return corpo;
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
      if (!dados.emails.length) corpo.appendChild(el("p", "Nenhum e-mail ainda. Confirmações, códigos de senha, convites e resultados aparecem aqui.", "teste-painel__vazio"));
      dados.emails.slice().reverse().forEach(function (m) {
        const caixa = el("div", "", "teste-painel__email");
        caixa.appendChild(el("p", "Para " + m.para + " · " + dataCurta(m.quando), "teste-painel__meta"));
        const assunto = el("p");
        assunto.appendChild(el("strong", m.assunto));
        caixa.appendChild(assunto);
        caixa.appendChild(textoComLinks(m.texto));
        corpo.appendChild(caixa);
      });
      return;
    }

    if (abaAtual === "acessos") {
      [
        "Organização: " + ORGANIZACAO_TESTE + ". No primeiro acesso, vá em Entrar e use \"Esqueci a senha\"; o código aparece em E-mails enviados. Depois de entrar, a organização convida avaliadores.",
        "Comissão: convide um avaliador na Área da organização. O e-mail de convite aparece em E-mails enviados, com o link para criar a senha.",
        "Inscritos: faça uma inscrição pelo formulário; ela já cria o acesso com a senha escolhida.",
      ].forEach(function (t) { corpo.appendChild(el("p", t, "teste-painel__vazio")); });
      return;
    }

    const r = dados.repo;
    corpo.appendChild(tabela("Inscrições", [["Número", "protocolo"], ["Nome", "nome"], ["CPF", "cpf"], ["E-mail", "email"], ["Categoria", "categoria"], ["E-mail de confirmação", "emailConfirmacao"]], r.inscricoes || []));
    corpo.appendChild(tabela("Trabalhos", [["Protocolo", "protocolo"], ["Título", "titulo"], ["Primeiro autor", "autorNome"], ["Coautores", "coautores"], ["Situação", "situacao"], ["Avaliado por", "avaliadorNome"], ["Comentário", "comentario"]], r.trabalhos || []));
    corpo.appendChild(tabela("Contas", [["E-mail", "email"], ["Nome", "nome"], ["Comissão", "comissao"], ["E-mail comprovado", "verificada"], ["Senha guardada", "senha"]], r.contas || []));
  }

  if (document.body) montarPainel();
  else document.addEventListener("DOMContentLoaded", montarPainel);
})();
