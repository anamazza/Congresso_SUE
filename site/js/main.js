/* =====================================================================
   1º Simpósio de Urgência e Emergência · configuração do site
   ---------------------------------------------------------------------
   Edite apenas o bloco CONFIG abaixo. O que ficar como "" (vazio) aparece
   no site como "a divulgar" ou "em breve". Preencha conforme as decisões
   da Comissão Organizadora forem saindo.
   ===================================================================== */
const CONFIG = {
  inscricoes: {
    url: "",              // vazio = usa o formulário do site quando o banco estiver ligado
    inicio: "06/10/2026",
    fim: "30/11/2026",    // o formulário de inscrição fecha sozinho depois deste dia
  },
  submissao: {
    url: "",              // vazio = usa a área do inscrito do site quando o banco estiver ligado
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
  // Banco que recebe os formulários de inscrição e de envio de trabalhos.
  // É o endereço do app da Web do Apps Script ligado à planilha (termina em
  // /exec). Passo a passo no README, seção "Banco de dados".
  // Enquanto estiver vazio, os formulários aparecem com o envio desligado.
  banco: {
    url: "",
    inscricoesEncerradas: false, // true fecha o formulário de inscrição (fecha sozinho após inscricoes.fim)
    submissaoEncerrada: false,   // true fecha o envio de trabalhos (fecha sozinho após submissao.prazo)
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

  // ---------- Banco dos formulários: endereço e estado ----------
  const modoTeste = /[?&]teste\b/.test(window.location.search);
  const bancoCfg = CONFIG.banco || {};
  const urlBanco = (function (url) {
    url = String(url || "").trim();
    if (url && !/^https:\/\//i.test(url)) {
      console.warn("Banco: o endereço precisa começar com https://");
      return "";
    }
    return url;
  })(bancoCfg.url);

  // "31/10/2026" vira o início ou o fim daquele dia no horário de Brasília,
  // o mesmo que o banco usa, qualquer que seja o fuso de quem acessa
  function diaEmBrasilia(data, hora) {
    const m = String(data || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? new Date(m[3] + "-" + m[2] + "-" + m[1] + "T" + hora + "-03:00") : null;
  }
  function fimDoDia(data) {
    return diaEmBrasilia(data, "23:59:59");
  }

  function estadoDe(encerrado) {
    if (modoTeste) return "aberto";
    if (encerrado) return "encerrado";
    return urlBanco ? "aberto" : "pendente";
  }
  const prazoTrabalhos = fimDoDia(ler("submissao.prazo"));
  const prazoInscricoes = fimDoDia(ler("inscricoes.fim"));
  const estadoInscricao = estadoDe(bancoCfg.inscricoesEncerradas || (prazoInscricoes && new Date() > prazoInscricoes));
  const estadoSubmissao = estadoDe(bancoCfg.submissaoEncerrada || (prazoTrabalhos && new Date() > prazoTrabalhos));

  // Com os formulários abertos, "Inscreva-se" e "Submeter trabalho" levam até eles
  function apontarBotoes(grupo, estado, destino, textoEncerrado) {
    CONFIG[grupo] = CONFIG[grupo] || {};
    if (estado === "aberto" && !ler(grupo + ".url")) CONFIG[grupo].url = destino;
    if (estado === "encerrado") {
      document.querySelectorAll('[data-config-href="' + grupo + '.url"]').forEach(function (el) {
        if (el.dataset.textoPendente) el.dataset.textoPendente = textoEncerrado;
      });
    }
  }
  apontarBotoes("inscricoes", estadoInscricao, "#/inscricoes/formulario", "Inscrições encerradas");
  apontarBotoes("submissao", estadoSubmissao, "#/submissao", "Submissão encerrada");

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

  // ---------- Relógio do fim das inscrições ----------
  const relogios = document.querySelectorAll('[data-relogio="inscricoes"]');
  const inicioInscricoes = diaEmBrasilia(ler("inscricoes.inicio"), "00:00:00");
  if (relogios.length && prazoInscricoes) {
    let intervalo = null;
    const dois = function (n) { return String(n).padStart(2, "0"); };
    const tique = function () {
      const agora = Date.now();
      const resta = prazoInscricoes - agora;
      const visivel = resta > 0 && !bancoCfg.inscricoesEncerradas && (!inicioInscricoes || agora >= inicioInscricoes);
      relogios.forEach(function (r) { r.hidden = !visivel; });
      if (!visivel) {
        if (resta <= 0 && intervalo) clearInterval(intervalo);
        return;
      }
      const s = Math.floor(resta / 1000);
      const v = {
        dias: Math.floor(s / 86400),
        horas: Math.floor((s % 86400) / 3600),
        minutos: Math.floor((s % 3600) / 60),
        segundos: s % 60,
      };
      const leitura = v.dias + (v.dias === 1 ? " dia, " : " dias, ") + v.horas + (v.horas === 1 ? " hora e " : " horas e ") +
        v.minutos + (v.minutos === 1 ? " minuto" : " minutos");
      relogios.forEach(function (r) {
        r.querySelectorAll("[data-unidade]").forEach(function (el) {
          const u = el.dataset.unidade;
          el.textContent = u === "dias" ? String(v.dias) : dois(v[u]);
        });
        r.querySelector('[data-rotulo="dias"]').textContent = v.dias === 1 ? "dia" : "dias";
        r.querySelector(".relogio__numeros").setAttribute("aria-label", "Faltam " + leitura);
      });
    };
    tique();
    intervalo = setInterval(tique, 1000);
  }

  // ---------- Contagem regressiva (3 e 4 de dezembro de 2026) ----------
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

  // ---------- Formulários: máscaras, validação e envio ao banco ----------
  const formatoNumero = new Intl.NumberFormat("pt-BR");
  const LIMITE_RESUMO = 2050; // caracteres sem espaços, conforme o edital
  const PARTES_RESUMO = ["introducao", "metodos", "resultados", "conclusoes"];

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

  function nomeCompleto(v) {
    return String(v || "").trim().split(/\s+/).length >= 2;
  }

  function limpar(v) {
    return String(v || "").trim().replace(/\s+/g, " ");
  }

  const regraCpf = function (v) {
    if (!soDigitos(v)) return "Informe o seu CPF.";
    return cpfValido(v) ? "" : "Confira o CPF. Os números digitados não formam um CPF válido.";
  };
  const regraEmail = function (v) {
    if (!v.trim()) return "Informe o seu e-mail.";
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Confira o e-mail. Ele precisa ter o formato nome@exemplo.com.";
  };

  function enviarAoBanco(acao, dados) {
    if (modoTeste) {
      return new Promise(function (ok) {
        setTimeout(function () {
          ok({ ok: true, protocolo: (acao === "inscricao" ? "INS" : "TRB") + "-TESTE" });
        }, 700);
      });
    }
    return fetch(urlBanco, {
      method: "POST",
      // Texto simples evita a checagem prévia de CORS, que o Apps Script não responde
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ acao: acao, dados: dados }),
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  // Liga um formulário: estado, validação, envio e tela de confirmação
  function ligarFormulario(o) {
    const form = o.form;
    const el = form.elements;
    const campos = form.querySelector(".inscricao__campos");
    const aviso = document.getElementById(o.prefixo + "-aviso");
    const sucesso = document.getElementById(o.prefixo + "-sucesso");
    const botao = form.querySelector('button[type="submit"]');
    const status = form.querySelector(".inscricao__status");
    const textoBotao = botao.textContent;
    let tentouEnviar = false;
    let enviando = false;

    function campoUnico(nome) {
      const c = el[nome];
      return c && c.nodeType === 1 ? c : null;
    }

    function mostrarErro(nome, msg) {
      const campo = campoUnico(nome);
      if (campo) {
        if (msg) campo.setAttribute("aria-invalid", "true");
        else campo.removeAttribute("aria-invalid");
      }
      const erro = document.getElementById(o.prefixo + "-" + nome + "-erro");
      if (erro) {
        erro.textContent = msg || "";
        erro.hidden = !msg;
      }
    }

    function validar(nome) {
      const campo = campoUnico(nome);
      const msg = o.regras[nome](campo ? campo.value : "", campo);
      mostrarErro(nome, msg);
      return !msg;
    }

    function focar(nome) {
      const alvo = (o.foco && o.foco(nome)) || campoUnico(nome);
      if (alvo) alvo.focus();
    }

    function definirStatus(texto, ehErro) {
      status.textContent = texto;
      status.classList.toggle("is-erro", !!ehErro);
    }

    function contarErros() {
      return Object.keys(o.regras).filter(function (n) { return !validar(n); });
    }

    if (o.estado !== "aberto") {
      campos.disabled = true;
      botao.disabled = true;
      botao.classList.add("btn--pendente");
      botao.textContent = o.estado === "encerrado" ? o.textos.botaoEncerrado : o.textos.botaoPendente;
      aviso.textContent = o.estado === "encerrado" ? o.textos.avisoEncerrado : o.textos.avisoPendente;
      aviso.hidden = false;
    } else if (modoTeste) {
      aviso.textContent = "Modo de teste: os dados preenchidos aqui não são enviados para ninguém.";
      aviso.classList.add("inscricao__aviso--teste");
      aviso.hidden = false;
    }

    Object.keys(o.mascaras || {}).forEach(function (nome) {
      el[nome].addEventListener("input", function () {
        el[nome].value = o.mascaras[nome](el[nome].value);
      });
    });

    // Antes do primeiro envio, confere cada campo ao sair dele. Depois, a cada mudança.
    form.addEventListener("focusout", function (e) {
      const nome = e.target.name;
      if (tentouEnviar || !o.regras[nome] || !e.target.value) return;
      if (e.target.type === "checkbox" || e.target.type === "radio") return;
      validar(nome);
    });
    function reavaliar() {
      if (!tentouEnviar) return;
      const n = contarErros().length;
      definirStatus(n ? (n === 1 ? "Falta corrigir 1 campo." : "Faltam corrigir " + n + " campos.") : "", n > 0);
    }
    form.addEventListener("input", reavaliar);
    form.addEventListener("change", reavaliar);

    function mostrarSucesso(dados, resposta) {
      sucesso.querySelectorAll("[data-sucesso]").forEach(function (alvo) {
        alvo.textContent = o.sucesso(alvo.dataset.sucesso, dados, resposta || {});
      });
      form.hidden = true;
      aviso.hidden = true;
      sucesso.hidden = false;
      sucesso.focus();
      sucesso.scrollIntoView({ block: "center" });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (o.estado !== "aberto" || enviando) return;
      tentouEnviar = true;

      const dados = o.coletar();
      // Robôs costumam preencher o campo invisível: finge que deu certo e não envia
      if (el.site && el.site.value) {
        mostrarSucesso(dados, {});
        return;
      }

      const invalidos = contarErros();
      if (invalidos.length) {
        definirStatus(invalidos.length === 1 ? "Falta corrigir 1 campo." : "Faltam corrigir " + invalidos.length + " campos.", true);
        focar(invalidos[0]);
        return;
      }

      enviando = true;
      botao.disabled = true;
      botao.textContent = "Enviando…";
      definirStatus("");
      enviarAoBanco(o.acao, dados)
        .then(function (resposta) {
          if (resposta && resposta.ok) {
            mostrarSucesso(dados, resposta);
            form.reset();
            if (o.aoLimpar) o.aoLimpar();
            tentouEnviar = false;
            definirStatus("");
            return;
          }
          // O banco recusou: mostra o motivo no campo indicado ou embaixo do botão
          const msg = (resposta && resposta.mensagem) || "Não foi possível concluir o envio. Tente de novo.";
          const campo = resposta && resposta.campo;
          if (campo && document.getElementById(o.prefixo + "-" + campo + "-erro")) {
            mostrarErro(campo, msg);
            focar(campo);
            definirStatus("Confira o campo destacado.", true);
          } else {
            definirStatus(msg, true);
          }
        })
        .catch(function () {
          definirStatus("Não foi possível enviar agora. Verifique a conexão com a internet e tente de novo.", true);
        })
        .then(function () {
          enviando = false;
          botao.disabled = false;
          botao.textContent = textoBotao;
        });
    });

    sucesso.querySelector("[data-novo]").addEventListener("click", function () {
      sucesso.hidden = true;
      form.hidden = false;
      if (modoTeste) aviso.hidden = false;
      definirStatus("");
      const primeiro = form.querySelector("input:not([type=hidden]):not([tabindex='-1'])");
      if (primeiro) primeiro.focus();
    });
  }

  // ----- Formulário de inscrição -----
  const formInscricao = document.getElementById("form-inscricao");
  if (formInscricao) {
    ligarFormulario({
      form: formInscricao,
      prefixo: "ins",
      acao: "inscricao",
      estado: estadoInscricao,
      textos: {
        botaoPendente: "Inscrições em breve",
        botaoEncerrado: "Inscrições encerradas",
        avisoPendente: "O formulário ainda não está recebendo inscrições. Ele será liberado em breve nesta página. Você já pode conferir os dados que serão pedidos.",
        avisoEncerrado: "As inscrições estão encerradas.",
      },
      mascaras: { cpf: mascaraCpf, celular: mascaraCelular },
      regras: {
        nome: function (v) {
          if (!v.trim()) return "Informe o seu nome completo.";
          return nomeCompleto(v) ? "" : "Escreva o nome e o sobrenome.";
        },
        cpf: regraCpf,
        celular: function (v) {
          const n = soDigitos(v).length;
          if (!n) return "Informe um celular para contato.";
          return n === 10 || n === 11 ? "" : "Informe o celular com DDD, por exemplo (21) 99999-9999.";
        },
        email: regraEmail,
        categoria: function (v) {
          return v ? "" : "Escolha a sua categoria profissional.";
        },
        instituicao: function (v) {
          return v.trim() ? "" : "Informe a instituição ou unidade onde você trabalha ou estuda.";
        },
        aceite: function (_v, campo) {
          return campo.checked ? "" : "Para se inscrever, é preciso concordar com o edital e com o aviso de privacidade.";
        },
      },
      coletar: function () {
        const el = formInscricao.elements;
        const marcado = formInscricao.querySelector('input[name="trabalho"]:checked');
        return {
          nome: limpar(el.nome.value),
          cpf: mascaraCpf(el.cpf.value),
          email: el.email.value.trim().toLowerCase(),
          celular: mascaraCelular(el.celular.value),
          categoria: el.categoria.value,
          instituicao: limpar(el.instituicao.value),
          trabalho: marcado ? marcado.value : "",
        };
      },
      sucesso: function (chave, dados, resposta) {
        if (chave === "nome") {
          const primeiro = limpar(dados.nome).split(" ")[0];
          return primeiro ? ", " + primeiro : "";
        }
        if (chave === "protocolo") return resposta.protocolo || "enviado por e-mail";
        if (chave === "email") return dados.email || "o seu e-mail";
        return "";
      },
    });
  }

  // ----- Formulário de envio de trabalhos (área do inscrito) -----
  const formTrabalho = document.getElementById("form-trabalho");
  if (formTrabalho) {
    const elT = formTrabalho.elements;
    const listaCoautores = document.getElementById("trb-coautores");
    const botaoCoautor = document.getElementById("trb-add-coautor");
    const campoApresentador = document.getElementById("trb-apresentadorCpf-campo");
    const contador = document.getElementById("trb-contador");
    const MAX_COAUTORES = 9;

    // Coautores: linhas que entram e saem
    function renumerarCoautores() {
      listaCoautores.querySelectorAll(".coautor").forEach(function (li, i) {
        const n = i + 2;
        li.querySelector(".coautor__titulo").textContent = "Autor " + n;
        ["nome", "instituicao"].forEach(function (parte) {
          const input = li.querySelector(".coautor__" + parte);
          input.id = "trb-autor" + n + "-" + parte;
          li.querySelector('label[data-parte="' + parte + '"]').htmlFor = input.id;
        });
        li.querySelector(".coautor__remover").setAttribute("aria-label", "Remover o autor " + n);
      });
      const total = listaCoautores.children.length;
      botaoCoautor.hidden = total >= MAX_COAUTORES;
    }

    function adicionarCoautor(focarNovo) {
      const li = document.createElement("li");
      li.className = "coautor";
      li.innerHTML =
        '<div class="coautor__cabecalho"><p class="coautor__titulo"></p>' +
        '<button class="coautor__remover" type="button">Remover</button></div>' +
        '<div class="campo"><label data-parte="nome">Nome completo</label>' +
        '<input class="coautor__nome" type="text" maxlength="120" autocomplete="off"></div>' +
        '<div class="campo"><label data-parte="instituicao">Instituição</label>' +
        '<input class="coautor__instituicao" type="text" maxlength="120" autocomplete="off"></div>';
      listaCoautores.appendChild(li);
      renumerarCoautores();
      if (focarNovo) li.querySelector(".coautor__nome").focus();
    }

    botaoCoautor.addEventListener("click", function () {
      adicionarCoautor(true);
    });
    listaCoautores.addEventListener("click", function (e) {
      const botao = e.target.closest(".coautor__remover");
      if (!botao) return;
      const li = botao.closest(".coautor");
      const vizinho = li.nextElementSibling || li.previousElementSibling;
      li.remove();
      renumerarCoautores();
      formTrabalho.dispatchEvent(new Event("change"));
      (vizinho ? vizinho.querySelector(".coautor__nome") : botaoCoautor).focus();
    });

    function lerCoautores() {
      return Array.prototype.map.call(listaCoautores.querySelectorAll(".coautor"), function (li) {
        return {
          li: li,
          nome: limpar(li.querySelector(".coautor__nome").value),
          instituicao: limpar(li.querySelector(".coautor__instituicao").value),
        };
      }).filter(function (c) {
        return c.nome || c.instituicao;
      });
    }

    // Apresentador: o CPF só aparece quando é um coautor
    function apresentaCoautor() {
      const marcado = formTrabalho.querySelector('input[name="apresentador"]:checked');
      return !!marcado && marcado.value === "coautor";
    }
    function atualizarApresentador() {
      campoApresentador.hidden = !apresentaCoautor();
    }
    formTrabalho.addEventListener("change", function (e) {
      if (e.target.name === "apresentador") atualizarApresentador();
    });

    // Contador do resumo
    function contarResumo() {
      return PARTES_RESUMO.reduce(function (soma, nome) {
        return soma + elT[nome].value.replace(/\s/g, "").length;
      }, 0);
    }
    function atualizarContador() {
      const n = contarResumo();
      const excedeu = n > LIMITE_RESUMO;
      contador.querySelector(".contador__total").textContent = formatoNumero.format(n);
      contador.querySelector(".contador__resto").textContent = excedeu
        ? "· passou " + formatoNumero.format(n - LIMITE_RESUMO)
        : "· restam " + formatoNumero.format(LIMITE_RESUMO - n);
      contador.querySelector(".contador__barra span").style.width = Math.min(100, (n / LIMITE_RESUMO) * 100) + "%";
      contador.classList.toggle("is-excedido", excedeu);
    }
    PARTES_RESUMO.forEach(function (nome) {
      elT[nome].addEventListener("input", atualizarContador);
    });
    atualizarContador();

    const regrasTrabalho = {
      cpf: regraCpf,
      email: regraEmail,
      titulo: function (v) {
        return v.trim() ? "" : "Informe o título do trabalho.";
      },
      tipo: function (v) {
        return v ? "" : "Escolha o tipo de trabalho.";
      },
      eixo: function (v) {
        return v ? "" : "Escolha o eixo temático.";
      },
      coautores: function () {
        let erro = false;
        listaCoautores.querySelectorAll(".coautor").forEach(function (li) {
          const nome = li.querySelector(".coautor__nome");
          const inst = li.querySelector(".coautor__instituicao");
          const vazia = !nome.value.trim() && !inst.value.trim();
          const nomeRuim = !vazia && !nomeCompleto(nome.value);
          const instRuim = !vazia && !inst.value.trim();
          [[nome, nomeRuim], [inst, instRuim]].forEach(function (par) {
            if (par[1]) par[0].setAttribute("aria-invalid", "true");
            else par[0].removeAttribute("aria-invalid");
          });
          if (nomeRuim || instRuim) erro = true;
        });
        return erro ? "Informe o nome completo e a instituição de cada coautor. Para tirar um coautor, use Remover." : "";
      },
      apresentadorCpf: function (v) {
        if (!apresentaCoautor()) return "";
        if (!soDigitos(v)) return "Informe o CPF de quem vai apresentar.";
        return cpfValido(v) ? "" : "Confira o CPF de quem vai apresentar.";
      },
      introducao: function (v) {
        return v.trim() ? "" : "Escreva a introdução.";
      },
      metodos: function (v) {
        return v.trim() ? "" : "Escreva os métodos.";
      },
      resultados: function (v) {
        return v.trim() ? "" : "Escreva os resultados.";
      },
      conclusoes: function (v) {
        return v.trim() ? "" : "Escreva as conclusões.";
      },
      resumo: function () {
        const n = contarResumo();
        return n > LIMITE_RESUMO
          ? "O resumo tem " + formatoNumero.format(n) + " caracteres sem espaços. Corte " + formatoNumero.format(n - LIMITE_RESUMO) + " para ficar no limite de 2.050."
          : "";
      },
      aceite: function (_v, campo) {
        return campo.checked ? "" : "Para enviar, é preciso confirmar a declaração.";
      },
    };

    ligarFormulario({
      form: formTrabalho,
      prefixo: "trb",
      acao: "trabalho",
      estado: estadoSubmissao,
      textos: {
        botaoPendente: "Submissão em breve",
        botaoEncerrado: "Submissão encerrada",
        avisoPendente: "O envio de trabalhos ainda não está aberto. Ele será liberado em breve nesta página. Você já pode conferir o que será pedido.",
        avisoEncerrado: "O prazo de envio de trabalhos está encerrado.",
      },
      mascaras: { cpf: mascaraCpf, apresentadorCpf: mascaraCpf },
      regras: regrasTrabalho,
      foco: function (nome) {
        if (nome === "coautores") return listaCoautores.querySelector("[aria-invalid]");
        if (nome === "resumo") return elT.introducao;
        return null;
      },
      coletar: function () {
        const dados = {
          cpf: mascaraCpf(elT.cpf.value),
          email: elT.email.value.trim().toLowerCase(),
          titulo: limpar(elT.titulo.value),
          tipo: elT.tipo.value,
          eixo: elT.eixo.value,
          coautores: lerCoautores().map(function (c) {
            return { nome: c.nome, instituicao: c.instituicao };
          }),
          apresentador: apresentaCoautor() ? "coautor" : "primeiro",
          apresentadorCpf: apresentaCoautor() ? mascaraCpf(elT.apresentadorCpf.value) : "",
        };
        PARTES_RESUMO.forEach(function (nome) {
          dados[nome] = elT[nome].value.trim();
        });
        return dados;
      },
      aoLimpar: function () {
        listaCoautores.textContent = "";
        renumerarCoautores();
        atualizarApresentador();
        atualizarContador();
      },
      sucesso: function (chave, dados, resposta) {
        if (chave === "protocolo") return resposta.protocolo || "enviado por e-mail";
        if (chave === "titulo") return dados.titulo || "";
        if (chave === "email") return dados.email || "o seu e-mail";
        return "";
      },
    });
    renumerarCoautores();
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
