/* =====================================================================
   1º Simpósio de Urgência e Emergência · configuração do site
   ---------------------------------------------------------------------
   Edite apenas o bloco CONFIG abaixo. O que ficar como "" (vazio) aparece
   no site como "a divulgar" ou "em breve". Preencha conforme as decisões
   da Comissão Organizadora forem saindo.
   ===================================================================== */
const CONFIG = {
  inscricoes: {
    url: "",              // vazio = usa o formulário desta página quando ele estiver ativo
    inicio: "25/09/2026",
    fim: "",              // ex.: "20/11/2026". Vazio aparece como "a divulgar"
  },
  submissao: {
    url: "",              // link da área do inscrito, onde os trabalhos são enviados
    inicio: "25/09/2026",
    prazo: "31/10/2026",
    normas: "",           // link do PDF com as normas de submissão (item do menu Trabalhos)
    modeloPoster: "",     // link do modelo de pôster (item do menu Trabalhos)
  },
  datas: {
    edital: "",           // divulgação do edital
    avaliacao: "",        // ex.: "21/10 a 04/11/2026"
    aprovados: "16/11/2026", // resultado final dos trabalhos
    programacao: "",      // divulgação da programação final
    apresentacao: "03 e 04/12/2026",
    certificados: "",     // disponibilização dos certificados
  },
  certificacao: {
    cargaHoraria: "",     // ex.: "16 horas"
    frequencia: "",       // ex.: "75% de presença"
  },
  edital: {
    url: "assets/Edital.docx", // troque pelo PDF final quando estiver pronto
  },
  // Formulário de inscrição da página "Inscrições". As respostas vão para um
  // Google Forms, que as guarda numa planilha. Passo a passo no README.
  // Enquanto o link estiver vazio, o formulário aparece com o envio desligado.
  formulario: {
    linkPreenchido: "",   // link pré-preenchido do Google Forms (ver README)
    encerrado: false,     // mude para true quando as vagas acabarem
  },
  contato: {
    email: "",            // ex.: "simposio.subhue@rio.rj.gov.br"
    telefone: "",         // ex.: "(21) 0000-0000"
    instagram: "",        // ex.: "https://www.instagram.com/simposio..."
  },
  normas: {
    maxCaracteres: "até 2.050 caracteres, sem contar espaços",
    maxAutores: "até 10, somando autores e coautores",
    maxTrabalhosPorAutor: "até 3 trabalhos como primeiro autor",
    poster: "",               // ex.: "90 cm de largura por 120 cm de altura"
    idioma: "",               // ex.: "português"
  },

  // Avisos aparecem na página "Avisos" e o mais recente também na Home.
  // Coloque o mais novo primeiro. A página some quando a lista está vazia.
  avisos: [
    // { data: "15/09/2026", titulo: "Inscrições abertas", texto: "Vagas limitadas, preenchidas por ordem de inscrição.", link: "" },
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

  // ---------- Formulário de inscrição: destino e estado ----------
  // O link pré-preenchido do Google Forms traz cada pergunta preenchida com o
  // nome do campo (nome, cpf, ...). Daí sai o endereço de envio e o número
  // "entry." de cada pergunta.
  const CAMPOS_FORM = ["nome", "cpf", "email", "celular", "categoria", "instituicao", "trabalho"];

  function lerLinkPreenchido(link) {
    link = String(link || "").trim();
    if (!link) return null;
    let url;
    try {
      url = new URL(link);
    } catch (erro) {
      console.warn("Formulário: o link pré-preenchido não é um endereço válido.");
      return null;
    }
    if (url.hostname !== "docs.google.com" || !/\/viewform$/.test(url.pathname)) {
      console.warn("Formulário: use o link pré-preenchido do Google Forms (termina em /viewform?...).");
      return null;
    }
    const mapa = {};
    url.searchParams.forEach(function (valor, chave) {
      const campo = valor.trim().toLowerCase();
      if (/^entry\.\d+$/.test(chave) && CAMPOS_FORM.indexOf(campo) >= 0) mapa[campo] = chave;
    });
    const faltando = CAMPOS_FORM.filter(function (c) { return !mapa[c]; });
    if (faltando.length) {
      console.warn("Formulário: faltam no link pré-preenchido os campos " + faltando.join(", ") + ".");
      return null;
    }
    return { acao: url.origin + url.pathname.replace(/\/viewform$/, "/formResponse"), mapa: mapa };
  }

  const formCfg = CONFIG.formulario || {};
  const modoTeste = /[?&]teste\b/.test(window.location.search);
  const destinoForm = lerLinkPreenchido(formCfg.linkPreenchido);
  const estadoForm = formCfg.encerrado ? "encerrado" : (destinoForm || modoTeste) ? "aberto" : "pendente";

  // Com o formulário aberto, os botões "Inscreva-se" levam até ele.
  if (estadoForm === "aberto" && !ler("inscricoes.url")) {
    CONFIG.inscricoes = CONFIG.inscricoes || {};
    CONFIG.inscricoes.url = "#/inscricoes/formulario";
  }
  if (estadoForm === "encerrado") {
    document.querySelectorAll('[data-config-href="inscricoes.url"]').forEach(function (el) {
      if (el.dataset.textoPendente) el.dataset.textoPendente = "Inscrições encerradas";
    });
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

  // ---------- Contagem regressiva (03 e 04 de dezembro de 2026) ----------
  const contagem = document.getElementById("contagem");
  const contagemSub = document.getElementById("contagem-sub");
  if (contagem) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicio = new Date(2026, 11, 3);
    const fim = new Date(2026, 11, 4);
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

  // ---------- Formulário de inscrição: máscaras, validação e envio ----------
  const form = document.getElementById("form-inscricao");
  if (form) iniciarFormulario(form);

  function soDigitos(v) {
    return String(v || "").replace(/\D/g, "");
  }

  function mascaraCpf(v) {
    const d = soDigitos(v).slice(0, 11);
    let r = d.slice(0, 3);
    if (d.length > 3) r += "." + d.slice(3, 6);
    if (d.length > 6) r += "." + d.slice(6, 9);
    if (d.length > 9) r += "-" + d.slice(9);
    return r;
  }

  function mascaraCelular(v) {
    const d = soDigitos(v).slice(0, 11);
    if (!d) return "";
    if (d.length <= 2) return "(" + d;
    const resto = d.slice(2);
    const corte = resto.length > 8 ? 5 : 4;
    return "(" + d.slice(0, 2) + ") " + (resto.length > corte ? resto.slice(0, corte) + "-" + resto.slice(corte) : resto);
  }

  function cpfValido(v) {
    const d = soDigitos(v);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    for (let t = 9; t < 11; t++) {
      let soma = 0;
      for (let i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
      if (((soma * 10) % 11) % 10 !== Number(d[t])) return false;
    }
    return true;
  }

  function iniciarFormulario(form) {
    const campos = document.getElementById("inscricao-campos");
    const aviso = document.getElementById("inscricao-aviso");
    const botao = document.getElementById("ins-enviar");
    const status = document.getElementById("ins-status");
    const sucesso = document.getElementById("inscricao-sucesso");
    const el = form.elements;
    let tentouEnviar = false;
    let enviando = false;

    const regras = {
      nome: function (v) {
        if (!v.trim()) return "Informe o seu nome completo.";
        if (v.trim().split(/\s+/).length < 2) return "Escreva o nome e o sobrenome.";
        return "";
      },
      cpf: function (v) {
        if (!soDigitos(v)) return "Informe o seu CPF.";
        return cpfValido(v) ? "" : "Confira o CPF. Os números digitados não formam um CPF válido.";
      },
      celular: function (v) {
        const n = soDigitos(v).length;
        if (!n) return "Informe um celular para contato.";
        return n === 10 || n === 11 ? "" : "Informe o celular com DDD, por exemplo (21) 99999-9999.";
      },
      email: function (v) {
        if (!v.trim()) return "Informe o seu e-mail.";
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Confira o e-mail. Ele precisa ter o formato nome@exemplo.com.";
      },
      categoria: function (v) {
        return v ? "" : "Escolha a sua categoria profissional.";
      },
      instituicao: function (v) {
        return v.trim() ? "" : "Informe a instituição ou unidade onde você trabalha ou estuda.";
      },
      aceite: function (_v, campo) {
        return campo.checked ? "" : "Para se inscrever, é preciso concordar com o edital e com o aviso de privacidade.";
      },
    };

    function validar(nome) {
      const campo = el[nome];
      const msg = regras[nome](campo.value, campo);
      const erro = document.getElementById("ins-" + nome + "-erro");
      if (msg) campo.setAttribute("aria-invalid", "true");
      else campo.removeAttribute("aria-invalid");
      if (erro) {
        erro.textContent = msg;
        erro.hidden = !msg;
      }
      return !msg;
    }

    function definirStatus(texto, ehErro) {
      status.textContent = texto;
      status.classList.toggle("is-erro", !!ehErro);
    }

    // Estado inicial: pendente (sem destino), encerrado ou aberto
    if (estadoForm !== "aberto") {
      campos.disabled = true;
      botao.disabled = true;
      botao.classList.add("btn--pendente");
      botao.textContent = estadoForm === "encerrado" ? "Inscrições encerradas" : "Inscrições em breve";
      aviso.textContent = estadoForm === "encerrado"
        ? "As inscrições estão encerradas porque as vagas se esgotaram."
        : "O formulário ainda não está recebendo inscrições. Ele será liberado em breve nesta página. Você já pode conferir os dados que serão pedidos.";
      aviso.hidden = false;
    } else if (modoTeste) {
      aviso.textContent = "Modo de teste: os dados preenchidos aqui não são enviados para ninguém.";
      aviso.classList.add("inscricao__aviso--teste");
      aviso.hidden = false;
    }

    el.cpf.addEventListener("input", function () {
      el.cpf.value = mascaraCpf(el.cpf.value);
    });
    el.celular.addEventListener("input", function () {
      el.celular.value = mascaraCelular(el.celular.value);
    });

    // Depois da primeira tentativa de envio, os erros somem assim que o campo é corrigido
    Object.keys(regras).forEach(function (nome) {
      const campo = el[nome];
      const reavaliar = function () {
        if (tentouEnviar || campo.getAttribute("aria-invalid") === "true") validar(nome);
      };
      campo.addEventListener(campo.tagName === "SELECT" || campo.type === "checkbox" ? "change" : "input", reavaliar);
      campo.addEventListener("blur", function () {
        if (tentouEnviar && campo.value) validar(nome);
      });
    });

    function coletar() {
      const marcado = form.querySelector('input[name="trabalho"]:checked');
      return {
        nome: el.nome.value.trim().replace(/\s+/g, " "),
        cpf: mascaraCpf(el.cpf.value),
        email: el.email.value.trim().toLowerCase(),
        celular: mascaraCelular(el.celular.value),
        categoria: el.categoria.value,
        instituicao: el.instituicao.value.trim().replace(/\s+/g, " "),
        trabalho: marcado ? marcado.value : "Não informado",
      };
    }

    function enviar(dados) {
      if (modoTeste) {
        return new Promise(function (ok) { setTimeout(ok, 700); });
      }
      const corpo = new URLSearchParams();
      CAMPOS_FORM.forEach(function (campo) {
        corpo.append(destinoForm.mapa[campo], dados[campo] || "");
      });
      // O Google Forms não devolve resposta legível para outro site ("no-cors").
      // Se a rede funcionou, a inscrição chegou.
      return fetch(destinoForm.acao, { method: "POST", mode: "no-cors", body: corpo });
    }

    function mostrarSucesso(dados) {
      const primeiroNome = (dados.nome || "").split(" ")[0];
      document.getElementById("sucesso-nome").textContent = primeiroNome ? ", " + primeiroNome : "";
      document.getElementById("sucesso-email").textContent = dados.email || "informado";
      form.hidden = true;
      aviso.hidden = true;
      sucesso.hidden = false;
      sucesso.focus();
      sucesso.scrollIntoView({ block: "center" });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (estadoForm !== "aberto" || enviando) return;
      tentouEnviar = true;

      const dados = coletar();
      // Robôs costumam preencher o campo invisível: finge que deu certo e não envia
      if (el.site.value) {
        mostrarSucesso(dados);
        return;
      }

      const invalidos = Object.keys(regras).filter(function (nome) { return !validar(nome); });
      if (invalidos.length) {
        definirStatus(invalidos.length === 1 ? "Falta corrigir 1 campo." : "Faltam corrigir " + invalidos.length + " campos.", true);
        el[invalidos[0]].focus();
        return;
      }

      enviando = true;
      botao.disabled = true;
      botao.textContent = "Enviando…";
      definirStatus("");
      enviar(dados)
        .then(function () {
          mostrarSucesso(dados);
          form.reset();
          tentouEnviar = false;
        })
        .catch(function () {
          definirStatus("Não foi possível enviar agora. Verifique a conexão com a internet e tente de novo.", true);
        })
        .then(function () {
          enviando = false;
          botao.disabled = false;
          botao.textContent = "Enviar inscrição";
        });
    });

    document.getElementById("ins-nova").addEventListener("click", function () {
      sucesso.hidden = true;
      form.hidden = false;
      if (modoTeste) aviso.hidden = false;
      definirStatus("");
      el.nome.focus();
    });
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
