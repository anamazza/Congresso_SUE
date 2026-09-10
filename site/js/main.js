/* =====================================================================
   1º Simpósio de Urgência e Emergência · configuração do site
   ---------------------------------------------------------------------
   Edite apenas o bloco CONFIG abaixo. O que ficar como "" (vazio) aparece
   no site como "a divulgar" ou "em breve". Preencha conforme as decisões
   da Comissão Organizadora forem saindo.
   ===================================================================== */
const CONFIG = {
  inscricoes: {
    url: "",              // ex.: "https://www.even3.com.br/simposio-urgencia-2026"
    plataforma: "",       // ex.: "Even3"
    inicio: "",           // ex.: "15/09/2026"
    fim: "",              // ex.: "20/11/2026"
    vagas: "250",
  },
  submissao: {
    url: "",              // link da plataforma de envio dos trabalhos
    plataforma: "",       // ex.: "Even3"
    inicio: "",           // ex.: "15/09/2026"
    prazo: "",            // ex.: "20/10/2026"
    normas: "",           // link do PDF com as normas de submissão (item do menu Trabalhos)
    modeloPoster: "",     // link do modelo de pôster (item do menu Trabalhos)
  },
  datas: {
    edital: "",           // divulgação do edital
    avaliacao: "",        // ex.: "21/10 a 04/11/2026"
    aprovados: "",        // divulgação dos trabalhos aprovados
    programacao: "",      // divulgação da programação final
    apresentacao: "",     // ex.: "27 e 28/11/2026"
    certificados: "",     // disponibilização dos certificados
  },
  certificacao: {
    cargaHoraria: "",     // ex.: "16 horas"
    frequencia: "",       // ex.: "75% de presença"
  },
  edital: {
    url: "assets/Edital.docx", // troque pelo PDF final quando estiver pronto
  },
  contato: {
    email: "",            // ex.: "simposio.subhue@rio.rj.gov.br"
    telefone: "",         // ex.: "(21) 0000-0000"
    instagram: "",        // ex.: "https://www.instagram.com/simposio..."
  },
  normas: {
    maxPalavras: "",          // ex.: "até 300 palavras"
    maxAutores: "",           // ex.: "até 6 autores por trabalho"
    maxTrabalhosPorAutor: "", // ex.: "até 2 trabalhos como autor principal"
    poster: "",               // ex.: "90 cm de largura por 120 cm de altura"
    idioma: "",               // ex.: "português"
  },

  // Avisos aparecem na página "Avisos" e o mais recente também na Home.
  // Coloque o mais novo primeiro. A página some quando a lista está vazia.
  avisos: [
    // { data: "15/09/2026", titulo: "Inscrições abertas", texto: "As inscrições vão até 20/11 ou até esgotarem as 250 vagas.", link: "" },
  ],

  // Instituições de apoio e parcerias, na página "Realização e apoio".
  // O logo é opcional: coloque o arquivo em assets/apoio/ e informe o caminho.
  apoio: [
    // { nome: "Nome da instituição", tipo: "Apoio", url: "https://...", logo: "assets/apoio/nome.png" },
  ],

  // As páginas "Comissões" e "Palestrantes" só aparecem no menu quando as
  // listas estiverem preenchidas. Siga o formato dos exemplos.
  comissao: {
    organizadora: [
      // { nome: "Nome Sobrenome", funcao: "Coordenação geral", instituicao: "SUBHUE" },
    ],
    cientifica: [
      // { nome: "Nome Sobrenome", funcao: "Presidência", instituicao: "Hospital Municipal ..." },
    ],
  },
  palestrantes: [
    // { nome: "Nome Sobrenome", instituicao: "Hospital Municipal ...", tema: "Sepse: reconhecimento precoce" },
  ],
};

/* =====================================================================
   Daqui para baixo não precisa editar.
   ===================================================================== */
(function () {
  "use strict";

  const PENDENTE = "a divulgar";

  function ler(caminho) {
    const valor = caminho.split(".").reduce(function (obj, chave) {
      return obj != null ? obj[chave] : undefined;
    }, CONFIG);
    return valor == null ? "" : String(valor).trim();
  }

  // ---------- Textos simples: <span data-config="inscricoes.inicio"> ----------
  document.querySelectorAll("[data-config]").forEach(function (el) {
    const valor = ler(el.dataset.config);
    el.textContent = valor || PENDENTE;
    el.classList.toggle("pendente", !valor);
  });

  // ---------- E-mail de contato: <a data-config-mailto="contato.email"> ----------
  document.querySelectorAll("[data-config-mailto]").forEach(function (el) {
    const valor = ler(el.dataset.configMailto);
    if (valor) {
      el.textContent = valor;
      el.setAttribute("href", "mailto:" + valor);
      el.classList.remove("pendente");
    } else {
      el.textContent = PENDENTE;
      el.removeAttribute("href");
      el.classList.add("pendente");
    }
  });

  // ---------- Links e botões: <a data-config-href="inscricoes.url" data-pendente="ocultar|manter"> ----------
  document.querySelectorAll("[data-config-href]").forEach(function (el) {
    const url = ler(el.dataset.configHref);
    const modoPendente = el.dataset.pendente || "manter";
    const alvoOcultar = el.closest("li") || el;

    if (url) {
      el.setAttribute("href", url);
      if (/^https?:\/\//i.test(url)) {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener");
      }
      el.classList.remove("btn--pendente", "pendente");
      if (el.dataset.textoAtivo) el.textContent = el.dataset.textoAtivo;
      alvoOcultar.hidden = false;
    } else if (modoPendente === "ocultar") {
      alvoOcultar.hidden = true;
    } else if (el.classList.contains("btn")) {
      el.classList.add("btn--pendente");
      if (el.dataset.textoPendente) el.textContent = el.dataset.textoPendente;
    } else {
      el.classList.add("pendente");
      el.removeAttribute("href");
      if (el.dataset.textoPendente) el.textContent = el.dataset.textoPendente;
    }
  });

  // ---------- Listas de pessoas (comissões e palestrantes) ----------
  function montarPessoas(ul, lista) {
    ul.textContent = "";
    lista.forEach(function (p) {
      const li = document.createElement("li");
      li.className = "pessoa";

      const nome = document.createElement("strong");
      nome.textContent = p.nome || "";
      li.appendChild(nome);

      const detalhe = [p.funcao, p.instituicao].filter(Boolean).join(" · ");
      if (detalhe) {
        const span = document.createElement("span");
        span.textContent = detalhe;
        li.appendChild(span);
      }
      if (p.tema) {
        const em = document.createElement("em");
        em.textContent = p.tema;
        li.appendChild(em);
      }
      ul.appendChild(li);
    });
  }

  function montarGrupo(idBloco, lista) {
    const bloco = document.getElementById(idBloco);
    if (!bloco) return false;
    const temItens = Array.isArray(lista) && lista.length > 0;
    bloco.hidden = !temItens;
    if (temItens) montarPessoas(bloco.querySelector("ul"), lista);
    return temItens;
  }

  function definirDisponibilidade(nomePagina, disponivel) {
    const pagina = document.querySelector('[data-pagina="' + nomePagina + '"]');
    if (!pagina) return;
    if (disponivel) delete pagina.dataset.indisponivel;
    else pagina.dataset.indisponivel = "1";
  }

  const comissao = CONFIG.comissao || {};
  const temOrganizadora = montarGrupo("comissao-organizadora", comissao.organizadora);
  const temCientifica = montarGrupo("comissao-cientifica", comissao.cientifica);
  definirDisponibilidade("comissoes", temOrganizadora || temCientifica);
  definirDisponibilidade("palestrantes", montarGrupo("palestrantes-lista", CONFIG.palestrantes));

  // ---------- Avisos (página e destaque na Home) ----------
  const avisos = (Array.isArray(CONFIG.avisos) ? CONFIG.avisos : []).filter(function (a) {
    return a && (a.titulo || a.texto);
  });
  const listaAvisos = document.getElementById("avisos-lista");
  if (listaAvisos) {
    listaAvisos.textContent = "";
    avisos.forEach(function (a) {
      const li = document.createElement("li");
      li.className = "aviso";
      if (a.data) {
        const t = document.createElement("time");
        t.textContent = a.data;
        li.appendChild(t);
      }
      if (a.titulo) {
        const h = document.createElement("h2");
        h.textContent = a.titulo;
        li.appendChild(h);
      }
      if (a.texto) {
        const p = document.createElement("p");
        p.textContent = a.texto;
        li.appendChild(p);
      }
      if (a.link) {
        const p = document.createElement("p");
        const link = document.createElement("a");
        link.href = a.link;
        link.textContent = a.textoLink || "Saiba mais";
        if (/^https?:\/\//i.test(a.link)) {
          link.target = "_blank";
          link.rel = "noopener";
        }
        p.appendChild(link);
        li.appendChild(p);
      }
      listaAvisos.appendChild(li);
    });
  }
  definirDisponibilidade("avisos", avisos.length > 0);
  const destaque = document.getElementById("aviso-destaque");
  if (destaque) {
    if (avisos.length) {
      const ultimo = avisos[0];
      destaque.querySelector(".aviso-destaque__texto").textContent =
        (ultimo.data ? ultimo.data + " · " : "") + (ultimo.titulo || ultimo.texto);
      destaque.hidden = false;
    } else {
      destaque.hidden = true;
    }
  }

  // ---------- Apoio e parcerias ----------
  const apoio = (Array.isArray(CONFIG.apoio) ? CONFIG.apoio : []).filter(function (a) {
    return a && a.nome;
  });
  const blocoApoio = document.getElementById("apoio-lista");
  if (blocoApoio) {
    blocoApoio.hidden = apoio.length === 0;
    const ul = blocoApoio.querySelector("ul");
    ul.textContent = "";
    apoio.forEach(function (a) {
      const li = document.createElement("li");
      li.className = "apoiador";
      const caixa = document.createElement(a.url ? "a" : "span");
      if (a.url) {
        caixa.href = a.url;
        caixa.target = "_blank";
        caixa.rel = "noopener";
      }
      if (a.logo) {
        const img = document.createElement("img");
        img.src = a.logo;
        img.alt = a.nome;
        img.loading = "lazy";
        caixa.appendChild(img);
      } else {
        const nome = document.createElement("strong");
        nome.textContent = a.nome;
        caixa.appendChild(nome);
      }
      li.appendChild(caixa);
      if (a.tipo) {
        const tipo = document.createElement("small");
        tipo.textContent = a.tipo;
        li.appendChild(tipo);
      }
      ul.appendChild(li);
    });
  }

  // Itens do menu que apontam para páginas ainda indisponíveis
  document.querySelectorAll("[data-vinculo]").forEach(function (li) {
    const pagina = document.querySelector('[data-pagina="' + li.dataset.vinculo + '"]');
    li.hidden = !pagina || !!pagina.dataset.indisponivel;
  });

  // ---------- Contagem regressiva (27 e 28 de novembro de 2026) ----------
  const contagem = document.getElementById("contagem");
  const contagemSub = document.getElementById("contagem-sub");
  if (contagem) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicio = new Date(2026, 10, 27);
    const fim = new Date(2026, 10, 28);
    const dias = Math.round((inicio - hoje) / 86400000);
    let titulo, sub;
    if (dias > 1) {
      titulo = "Faltam " + dias + " dias";
      sub = "para o simpósio";
    } else if (dias === 1) {
      titulo = "É amanhã";
      sub = "até lá!";
    } else if (hoje <= fim) {
      titulo = "É hoje";
      sub = "bom simpósio!";
    } else {
      titulo = "Simpósio realizado";
      sub = "obrigado pela participação";
    }
    contagem.textContent = titulo;
    if (contagemSub) contagemSub.textContent = sub;
  }

  // ---------- Menu no celular ----------
  const botaoMenu = document.querySelector(".topo__menu");
  const nav = document.getElementById("menu-principal");
  function fecharMenuCelular() {
    if (!botaoMenu || !nav) return;
    botaoMenu.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-aberto");
  }
  if (botaoMenu && nav) {
    botaoMenu.addEventListener("click", function () {
      const aberto = botaoMenu.getAttribute("aria-expanded") === "true";
      botaoMenu.setAttribute("aria-expanded", String(!aberto));
      nav.classList.toggle("is-aberto", !aberto);
    });
  }

  // ---------- Listas suspensas do menu ----------
  const grupos = Array.prototype.slice.call(document.querySelectorAll(".menu__grupo > details"));
  const desktopComMouse = window.matchMedia("(min-width: 900px)");

  function fecharListas(excecao) {
    grupos.forEach(function (d) {
      if (d !== excecao) d.open = false;
    });
  }

  grupos.forEach(function (d) {
    const item = d.parentElement;
    const resumo = d.querySelector("summary");

    d.addEventListener("toggle", function () {
      if (d.open) fecharListas(d);
    });

    // No computador a lista abre ao passar o mouse e fecha ao sair.
    item.addEventListener("mouseenter", function () {
      if (desktopComMouse.matches) d.open = true;
    });
    item.addEventListener("mouseleave", function () {
      if (desktopComMouse.matches) d.open = false;
    });
    // Com a lista já aberta pelo mouse, o clique não deve fechá-la.
    resumo.addEventListener("click", function (e) {
      if (desktopComMouse.matches && d.open && e.detail > 0) e.preventDefault();
    });
    // Fecha quando o foco do teclado sai do grupo.
    item.addEventListener("focusout", function (e) {
      if (!item.contains(e.relatedTarget)) d.open = false;
    });
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".menu__grupo")) fecharListas();
    if (nav && !e.target.closest(".topo")) fecharMenuCelular();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      fecharListas();
      fecharMenuCelular();
    }
  });

  // ---------- Páginas: cada link "#/pagina" ou "#/pagina/trecho" abre uma seção ----------
  const TITULO_BASE = document.title;
  const paginas = Array.prototype.slice.call(document.querySelectorAll("[data-pagina]"));

  function lerRota(hash) {
    const partes = String(hash || "").replace(/^#\/?/, "").split("/");
    return { pagina: partes[0] || "inicio", trecho: partes[1] || "" };
  }

  function encontrarPagina(nome) {
    return paginas.filter(function (p) {
      return p.dataset.pagina === nome && !p.dataset.indisponivel;
    })[0] || null;
  }

  function mostrarPagina(rota) {
    const alvo = encontrarPagina(rota.pagina) || encontrarPagina("inicio");
    if (!alvo) return;

    paginas.forEach(function (p) {
      p.hidden = p !== alvo;
    });

    document.title = alvo.dataset.titulo ? alvo.dataset.titulo + " · " + TITULO_BASE : TITULO_BASE;

    const rotaAtual = "#/" + alvo.dataset.pagina + (rota.trecho ? "/" + rota.trecho : "");
    document.querySelectorAll('.topo__nav a[href^="#/"]').forEach(function (a) {
      if (a.getAttribute("href") === rotaAtual) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.querySelectorAll(".menu__grupo").forEach(function (grupo) {
      const contemPagina = Array.prototype.some.call(grupo.querySelectorAll('a[href^="#/"]'), function (a) {
        return lerRota(a.getAttribute("href")).pagina === alvo.dataset.pagina;
      });
      grupo.classList.toggle("is-atual", contemPagina);
    });

    fecharListas();
    fecharMenuCelular();

    if (rota.trecho) {
      const el = document.getElementById(rota.trecho);
      if (el) {
        el.scrollIntoView({ block: "start" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }

  function navegar(hash) {
    const rota = lerRota(hash);
    try {
      if (window.location.hash !== hash) window.location.hash = hash;
    } catch (erro) {
      // Alguns visualizadores bloqueiam a alteração do endereço; a página abre mesmo assim.
    }
    mostrarPagina(rota);
  }

  document.addEventListener("click", function (e) {
    const link = e.target.closest('a[href^="#/"]');
    if (!link) return;
    e.preventDefault();
    navegar(link.getAttribute("href"));
  });

  window.addEventListener("hashchange", function () {
    mostrarPagina(lerRota(window.location.hash));
  });

  mostrarPagina(lerRota(window.location.hash));
})();
