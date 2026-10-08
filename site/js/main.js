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
    prazo: "06/11/2026",    // o envio de trabalhos fecha sozinho depois deste dia
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
    // Modo de teste (site aberto com ?teste). Vazio = o banco roda dentro do
    // navegador (js/banco-teste.js), com os dados guardados só ali. Com o
    // endereço de uma planilha de testes do Google, os envios vão para ela.
    // Quem entra pelo endereço normal nunca usa nenhum dos dois.
    // README, seção "Ambiente de teste".
    urlTeste: "",
  },
  contato: {
    email: "",            // ex.: "simposio.subhue@rio.rj.gov.br"
    telefone: "",         // ex.: "(21) 0000-0000"
    instagram: "",        // ex.: "https://www.instagram.com/simposio..."
  },
  normas: {
    maxCaracteres: "até 2.500 caracteres, sem contar espaços",
    maxTitulo: "até 200 caracteres, contando espaços",
    maxAutores: "até 8, somando autores e coautores",
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
  // A cópia do GitHub Pages (*.github.io) serve só para testes: lá o site
  // abre sempre no modo de teste. No endereço oficial, só com ?teste.
  const copiaDeTeste = /\.github\.io$/i.test(window.location.hostname);
  const modoTeste = copiaDeTeste || /[?&]teste\b/.test(window.location.search);
  const bancoCfg = CONFIG.banco || {};
  function enderecoDoBanco(url) {
    url = String(url || "").trim();
    if (url && !/^https:\/\//i.test(url)) {
      console.warn("Banco: o endereço precisa começar com https://");
      return "";
    }
    return url;
  }
  const urlBanco = enderecoDoBanco(bancoCfg.url);
  // No modo de teste com urlTeste preenchido, os envios vão para a planilha de testes
  const urlBancoTeste = modoTeste ? enderecoDoBanco(bancoCfg.urlTeste) : "";

  // "06/11/2026" vira o início ou o fim daquele dia no horário de Brasília,
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
  const LIMITE_RESUMO = 2500; // caracteres sem espaços, conforme o edital
  const LIMITE_TITULO = 200;  // caracteres contando os espaços
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
  function emailValido(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim());
  }
  const SENHA_MINIMA = 8;
  function regraSenha(v) {
    if (!v) return "Crie uma senha para a área do inscrito.";
    return v.length < SENHA_MINIMA ? "A senha precisa ter pelo menos " + SENHA_MINIMA + " caracteres." : "";
  }
  const regraEmail = function (v) {
    if (!v.trim()) return "Informe o seu e-mail.";
    return emailValido(v) ? "" : "Confira o e-mail. Ele precisa ter o formato nome@exemplo.com.";
  };

  // Banco de teste dentro do navegador: carregado só no modo de teste
  let bancoDoNavegador = null;
  function carregarBancoDoNavegador() {
    if (!bancoDoNavegador) {
      bancoDoNavegador = new Promise(function (ok) {
        if (window.bancoDeTeste) return ok(window.bancoDeTeste);
        const script = document.createElement("script");
        script.src = "js/banco-teste.js";
        script.onload = function () { ok(window.bancoDeTeste || null); };
        script.onerror = function () { ok(null); };
        document.body.appendChild(script);
      });
    }
    return bancoDoNavegador;
  }
  if (modoTeste && !urlBancoTeste) carregarBancoDoNavegador();

  function enviarAoBanco(acao, dados) {
    if (modoTeste && !urlBancoTeste) {
      // Sem o banco do navegador (como no arquivo único), as respostas são só simuladas
      return carregarBancoDoNavegador().then(function (banco) {
        return new Promise(function (ok) {
          setTimeout(function () { ok(banco ? banco.enviar(acao, dados) : simularBanco(acao, dados)); }, 400);
        });
      });
    }
    return fetch(modoTeste ? urlBancoTeste : urlBanco, {
      method: "POST",
      // Texto simples evita a checagem prévia de CORS, que o Apps Script não responde
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ acao: acao, dados: dados }),
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  // Modo de teste sem planilha: respostas de mentira, nada sai do navegador
  function simularBanco(acao, dados) {
    const primeiro = limpar(dados.nome || "Pessoa de Teste").split(" ")[0];
    if (acao === "inscricao") return { ok: true, protocolo: "INS-TESTE", nome: primeiro, token: "simulado" };
    if (acao === "trabalho") return { ok: true, protocolo: "TRB-TESTE" };
    if (acao === "entrar" || acao === "novaSenha") return { ok: true, token: "simulado", nome: "Pessoa" };
    if (acao === "pedirCodigo") return { ok: true, mensagem: "Modo de teste: nenhum código é enviado. Digite quaisquer 6 números." };
    if (acao === "painel") {
      return {
        ok: true,
        inscricao: {
          protocolo: "INS-TESTE", data: "", nome: "Pessoa de Teste", cpf: "000.000.000-00", email: "teste@exemplo.com",
          celular: "(21) 99999-9999", categoria: "Outra área", instituicao: "Simulação",
        },
        trabalhos: [],
        submissao: { aberta: true, prazo: ler("submissao.prazo"), maximo: 3, restantes: 3 },
      };
    }
    return { ok: acao === "sair" };
  }

  // ---------- Sessão da área do inscrito ----------
  // Fica só nesta aba do navegador (sessionStorage): ao fechar a aba, a
  // pessoa sai. Mais seguro nos computadores compartilhados das unidades.
  const CHAVE_SESSAO = "simposio-ue-sessao";
  let sessao = (function () {
    try {
      const s = JSON.parse(window.sessionStorage.getItem(CHAVE_SESSAO) || "null");
      return s && typeof s.token === "string" && s.token ? s : null;
    } catch (erro) {
      return null;
    }
  })();
  let avisoSessao = "";   // motivo da última saída forçada, mostrado na tela de entrar
  let painelAtual = null; // última resposta do banco com a inscrição e os trabalhos
  let painelPedido = null;
  const aoMudarSessao = [];
  const aoMostrarPagina = {}; // ganchos chamados quando o menu abre uma página

  function abrirSessao(token, nome) {
    sessao = { token: token, nome: nome || "" };
    painelAtual = null;
    avisoSessao = "";
    try {
      window.sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    } catch (erro) {
      // Sem armazenamento: a sessão vale até a página ser recarregada
    }
    aoMudarSessao.forEach(function (f) { f(); });
  }

  // Sem motivo: a pessoa clicou em Sair. Com motivo: o banco encerrou a sessão.
  function fecharSessao(motivo) {
    if (sessao && !motivo) enviarAoBanco("sair", { token: sessao.token }).catch(function () {});
    sessao = null;
    painelAtual = null;
    avisoSessao = motivo || "";
    try {
      window.sessionStorage.removeItem(CHAVE_SESSAO);
    } catch (erro) {
      // nada a apagar
    }
    aoMudarSessao.forEach(function (f) { f(); });
  }

  // Inscrição e trabalhos de quem entrou. Com "forcar", pergunta de novo ao banco.
  function carregarPainel(forcar) {
    if (!sessao) return Promise.resolve(null);
    if (painelAtual && !forcar) return Promise.resolve(painelAtual);
    if (painelPedido) return painelPedido;
    const token = sessao.token;
    painelPedido = enviarAoBanco("painel", { token: token }).then(function (r) {
      painelPedido = null;
      if (!sessao || sessao.token !== token) return null;
      if (r && r.ok) {
        painelAtual = r;
        return r;
      }
      if (r && r.erro === "sessao") fecharSessao(r.mensagem);
      return null;
    }, function () {
      painelPedido = null;
      return null;
    });
    return painelPedido;
  }

  document.querySelectorAll("[data-sair]").forEach(function (botao) {
    botao.addEventListener("click", function () { fecharSessao(); });
  });

  // "Mostrar a senha": troca o tipo dos campos listados na caixa
  document.querySelectorAll("[data-mostrar-senha]").forEach(function (caixa) {
    function aplicar() {
      caixa.dataset.mostrarSenha.split(" ").forEach(function (id) {
        const campo = document.getElementById(id);
        if (campo) campo.type = caixa.checked ? "text" : "password";
      });
    }
    caixa.addEventListener("change", aplicar);
    if (caixa.form) caixa.form.addEventListener("reset", function () { setTimeout(aplicar, 0); });
  });

  // Liga um formulário: estado, validação, envio e tela de confirmação.
  // Opcionais: o.aoConcluir(resposta, dados) devolve true quando ele mesmo
  // cuida do sucesso; o.aoRecusar(resposta) devolve true quando trata a recusa.
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
      if (aviso) {
        aviso.textContent = o.estado === "encerrado" ? o.textos.avisoEncerrado : o.textos.avisoPendente;
        aviso.hidden = false;
      }
    } else if (modoTeste && aviso) {
      aviso.textContent = urlBancoTeste
        ? "Ambiente de teste: os envios vão para a planilha de testes, e não para a lista oficial. O e-mail de confirmação chega com [TESTE] no assunto."
        : "Modo de teste: os dados ficam só neste navegador e não vão para ninguém. Os e-mails aparecem no Painel de teste, no canto da tela.";
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
      if (!sucesso) return;
      sucesso.querySelectorAll("[data-sucesso]").forEach(function (alvo) {
        alvo.textContent = o.sucesso(alvo.dataset.sucesso, dados, resposta || {});
      });
      form.hidden = true;
      if (aviso) aviso.hidden = true;
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
            if (!(o.aoConcluir && o.aoConcluir(resposta, dados))) mostrarSucesso(dados, resposta);
            form.reset();
            if (o.aoLimpar) o.aoLimpar();
            tentouEnviar = false;
            definirStatus("");
            return;
          }
          // O banco recusou: mostra o motivo no campo indicado ou embaixo do botão
          if (o.aoRecusar && o.aoRecusar(resposta || {})) return;
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

    if (sucesso) {
      sucesso.querySelector("[data-novo]").addEventListener("click", function () {
        sucesso.hidden = true;
        form.hidden = false;
        if (modoTeste && aviso) aviso.hidden = false;
        definirStatus("");
        const primeiro = form.querySelector("input:not([type=hidden]):not([tabindex='-1'])");
        if (primeiro) primeiro.focus();
      });
    }

    return { mostrarErro: mostrarErro, definirStatus: definirStatus };
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
          const d = soDigitos(v);
          if (!d) return "Informe um celular para contato.";
          if (d.length !== 11) return "Informe o DDD e os 9 números do celular, por exemplo (21) 99999-9999.";
          if (d[2] !== "9") return "O número do celular começa com 9 depois do DDD, por exemplo (21) 99999-9999.";
          return /^[1-9]{2}/.test(d) ? "" : "Confira o DDD.";
        },
        email: regraEmail,
        categoria: function (v) {
          return v ? "" : "Escolha a sua categoria profissional.";
        },
        instituicao: function (v) {
          return v.trim() ? "" : "Informe a instituição ou unidade onde você trabalha ou estuda.";
        },
        senha: regraSenha,
        senha2: function (v) {
          if (!v) return "Repita a senha.";
          return v === formInscricao.elements.senha.value ? "" : "As duas senhas estão diferentes.";
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
          senha: el.senha.value,
        };
      },
      // A inscrição já abre a sessão da área do inscrito
      aoConcluir: function (resposta) {
        if (resposta.token) abrirSessao(resposta.token, resposta.nome);
        return false;
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
    const selApresentador = elT.apresentador;
    const contador = document.getElementById("trb-contador");
    const MAX_COAUTORES = 7; // 8 autores no total, conforme o edital
    const PARTES_COAUTOR = ["nome", "cpf", "email", "instituicao"];
    let liApresentador = null; // linha do coautor escolhido para apresentar

    // Coautores: linhas que entram e saem
    function renumerarCoautores() {
      listaCoautores.querySelectorAll(".coautor").forEach(function (li, i) {
        const n = i + 2;
        li.dataset.numero = String(n);
        li.querySelector(".coautor__titulo").textContent = "Autor " + n;
        PARTES_COAUTOR.forEach(function (parte) {
          const input = li.querySelector(".coautor__" + parte);
          input.id = "trb-autor" + n + "-" + parte;
          li.querySelector('label[data-parte="' + parte + '"]').htmlFor = input.id;
        });
        li.querySelector(".coautor__remover").setAttribute("aria-label", "Remover o autor " + n);
      });
      botaoCoautor.hidden = listaCoautores.children.length >= MAX_COAUTORES;
      atualizarApresentador();
    }

    function adicionarCoautor(focarNovo) {
      const li = document.createElement("li");
      li.className = "coautor";
      li.innerHTML =
        '<div class="coautor__cabecalho"><p class="coautor__titulo"></p>' +
        '<button class="coautor__remover" type="button">Remover</button></div>' +
        '<div class="campo"><label data-parte="cpf">CPF</label>' +
        '<input class="coautor__cpf" type="text" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" autocomplete="off"></div>' +
        '<div class="campo"><label data-parte="email">E-mail</label>' +
        '<input class="coautor__email" type="email" maxlength="120" autocomplete="off"></div>' +
        '<p class="coautor__nota coautor__largo" aria-live="polite"></p>' +
        '<div class="campo coautor__largo"><label data-parte="nome">Nome completo</label>' +
        '<input class="coautor__nome" type="text" maxlength="120" autocomplete="off"></div>' +
        '<div class="campo coautor__largo"><label data-parte="instituicao">Instituição <span class="campo__opcional">opcional</span></label>' +
        '<input class="coautor__instituicao" type="text" maxlength="120" autocomplete="off"></div>';
      listaCoautores.appendChild(li);
      renumerarCoautores();
      if (focarNovo) li.querySelector(".coautor__cpf").focus();
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
      (vizinho ? vizinho.querySelector(".coautor__cpf") : botaoCoautor).focus();
    });
    listaCoautores.addEventListener("input", function (e) {
      if (e.target.classList.contains("coautor__cpf")) e.target.value = mascaraCpf(e.target.value);
      if (e.target.classList.contains("coautor__nome")) atualizarApresentador();
    });

    function lerCoautores() {
      return Array.prototype.map.call(listaCoautores.querySelectorAll(".coautor"), function (li) {
        return {
          numero: li.dataset.numero,
          nome: limpar(li.querySelector(".coautor__nome").value),
          cpf: mascaraCpf(li.querySelector(".coautor__cpf").value),
          email: li.querySelector(".coautor__email").value.trim().toLowerCase(),
          instituicao: limpar(li.querySelector(".coautor__instituicao").value),
        };
      }).filter(function (c) {
        return c.nome || c.cpf || c.email || c.instituicao;
      });
    }

    // Apresentador: lista com o primeiro autor e os coautores preenchidos
    selApresentador.addEventListener("change", function () {
      liApresentador = selApresentador.value === "primeiro"
        ? null
        : listaCoautores.querySelector('.coautor[data-numero="' + selApresentador.value + '"]');
    });
    function atualizarApresentador() {
      if (liApresentador && !liApresentador.isConnected) liApresentador = null;
      selApresentador.textContent = "";
      const opcoes = [["primeiro", "Eu mesmo(a), autor 1"]];
      listaCoautores.querySelectorAll(".coautor").forEach(function (li) {
        const nome = limpar(li.querySelector(".coautor__nome").value);
        opcoes.push([li.dataset.numero, "Autor " + li.dataset.numero + (nome ? " · " + nome : "")]);
      });
      opcoes.forEach(function (o) {
        const op = document.createElement("option");
        op.value = o[0];
        op.textContent = o[1];
        selApresentador.appendChild(op);
      });
      selApresentador.value = liApresentador ? liApresentador.dataset.numero : "primeiro";
    }

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
        : n === LIMITE_RESUMO ? "· limite atingido" : "· restam " + formatoNumero.format(LIMITE_RESUMO - n);
      contador.querySelector(".contador__barra span").style.width = Math.min(100, (n / LIMITE_RESUMO) * 100) + "%";
      contador.classList.toggle("is-excedido", excedeu);
    }

    // Limite do resumo: como no título, o texto para de entrar ao chegar em
    // 2.500 caracteres sem espaços, somando as quatro partes. O que passar do
    // limite (ao digitar ou colar) é cortado, com um aviso embaixo da parte.
    const resumoAceito = {}; // último texto aceito em cada parte
    function guardarResumo() {
      PARTES_RESUMO.forEach(function (nome) { resumoAceito[nome] = elT[nome].value; });
    }
    function semEspacos(t) {
      return t.replace(/\s/g, "").length;
    }
    // Primeiros "max" caracteres que não são espaço, com os espaços entre eles
    function cortarNoLimite(t, max) {
      let vistos = 0;
      for (let i = 0; i < t.length && max > 0; i++) {
        if (/\s/.test(t[i])) continue;
        if (++vistos === max) {
          const c = t.charCodeAt(i);
          return t.slice(0, c >= 0xd800 && c <= 0xdbff ? i : i + 1); // não parte um emoji ao meio
        }
      }
      return max > 0 ? t : "";
    }
    function avisarLimite(nome, texto) {
      PARTES_RESUMO.forEach(function (outro) {
        document.getElementById("trb-" + outro + "-limite").textContent = outro === nome ? texto : "";
      });
    }
    function limitarResumo(campo) {
      const antes = resumoAceito[campo.name];
      const agora = campo.value;
      const total = contarResumo();
      if (total > LIMITE_RESUMO && agora !== antes) {
        // O trecho novo fica entre o começo e o fim que não mudaram; o cursor marca o fim dele
        let fim = 0;
        while (fim < antes.length && fim < agora.length && antes[antes.length - 1 - fim] === agora[agora.length - 1 - fim]) fim++;
        fim = Math.min(fim, agora.length - campo.selectionEnd);
        let ini = 0;
        while (ini < antes.length - fim && ini < agora.length - fim && antes[ini] === agora[ini]) ini++;
        const novo = agora.slice(ini, agora.length - fim);
        const aceito = cortarNoLimite(novo, LIMITE_RESUMO - (total - semEspacos(novo)));
        if (aceito !== novo) {
          campo.value = agora.slice(0, ini) + aceito + agora.slice(agora.length - fim);
          campo.setSelectionRange(ini + aceito.length, ini + aceito.length);
          const limite = "Limite de " + formatoNumero.format(LIMITE_RESUMO) + " caracteres atingido. ";
          avisarLimite(campo.name, semEspacos(novo) - semEspacos(aceito) > 1
            ? limite + "O texto colado foi cortado: confira o final dele."
            : limite + "Para escrever mais, apague algum trecho do resumo.");
        }
      } else if (total < LIMITE_RESUMO) {
        avisarLimite("", "");
      }
      resumoAceito[campo.name] = campo.value;
      atualizarContador();
    }
    PARTES_RESUMO.forEach(function (nome) {
      elT[nome].addEventListener("input", function (e) {
        if (e.isComposing) return; // acento ainda sendo montado: confere ao terminar
        limitarResumo(e.target);
      });
      elT[nome].addEventListener("compositionend", function (e) {
        limitarResumo(e.target);
      });
    });
    guardarResumo();
    atualizarContador();

    // Contador do título (conta os espaços, como o banco)
    const contagemTitulo = document.getElementById("trb-titulo-contagem");
    function atualizarTitulo() {
      const n = limpar(elT.titulo.value).length;
      contagemTitulo.textContent = formatoNumero.format(n) + " de " + LIMITE_TITULO + " caracteres";
      contagemTitulo.classList.toggle("is-excedido", n > LIMITE_TITULO);
    }
    elT.titulo.addEventListener("input", atualizarTitulo);
    atualizarTitulo();

    // CPF de quem entrou, para não repetir a pessoa entre os coautores
    function cpfDoAutor() {
      return soDigitos(painelAtual && painelAtual.inscricao ? painelAtual.inscricao.cpf : "");
    }
    let emailDoEnvio = "";

    const regrasTrabalho = {
      titulo: function (v) {
        const n = limpar(v).length;
        if (!n) return "Informe o título do trabalho.";
        return n > LIMITE_TITULO ? "O título tem " + n + " caracteres. O limite é " + LIMITE_TITULO + ", contando os espaços." : "";
      },
      tipo: function (v) {
        return v ? "" : "Escolha o tipo de trabalho.";
      },
      eixo: function (v) {
        return v ? "" : "Escolha o eixo temático.";
      },
      coautores: function () {
        const cpfProprio = cpfDoAutor();
        const vistos = {};
        let incompleto = false;
        let repetido = false;
        listaCoautores.querySelectorAll(".coautor").forEach(function (li) {
          const c = {};
          PARTES_COAUTOR.forEach(function (parte) { c[parte] = li.querySelector(".coautor__" + parte); });
          const vazia = PARTES_COAUTOR.every(function (parte) { return !c[parte].value.trim(); });
          const digitos = soDigitos(c.cpf.value);
          const ruim = {
            nome: !vazia && !nomeCompleto(c.nome.value),
            cpf: !vazia && !cpfValido(c.cpf.value),
            email: !vazia && !emailValido(c.email.value),
            instituicao: false,
          };
          const duplicado = !vazia && !ruim.cpf && (vistos[digitos] || digitos === cpfProprio);
          if (!vazia && !ruim.cpf) vistos[digitos] = true;
          if (duplicado) ruim.cpf = true;
          PARTES_COAUTOR.forEach(function (parte) {
            if (ruim[parte]) c[parte].setAttribute("aria-invalid", "true");
            else c[parte].removeAttribute("aria-invalid");
          });
          if (ruim.nome || ruim.email || (ruim.cpf && !duplicado)) incompleto = true;
          if (duplicado) repetido = true;
        });
        if (incompleto) return "Informe nome completo, CPF válido e e-mail de cada coautor. Para tirar um coautor, use Remover.";
        if (repetido) return "O mesmo CPF aparece em mais de um autor. Confira os CPFs dos coautores.";
        return "";
      },
      apresentador: function (v) {
        if (v === "primeiro") return "";
        const li = listaCoautores.querySelector('.coautor[data-numero="' + v + '"]');
        if (!li) return "Escolha quem vai apresentar o trabalho.";
        return cpfValido(li.querySelector(".coautor__cpf").value) ? "" : "Preencha um CPF válido para o autor " + v + ", que vai apresentar.";
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
          ? "O resumo tem " + formatoNumero.format(n) + " caracteres sem espaços. Corte " + formatoNumero.format(n - LIMITE_RESUMO) + " para ficar no limite de " + formatoNumero.format(LIMITE_RESUMO) + "."
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
      regras: regrasTrabalho,
      foco: function (nome) {
        if (nome === "coautores") return listaCoautores.querySelector("[aria-invalid]");
        if (nome === "resumo") return elT.introducao;
        return null;
      },
      coletar: function () {
        emailDoEnvio = painelAtual && painelAtual.inscricao ? painelAtual.inscricao.email : "";
        const dados = {
          token: sessao ? sessao.token : "",
          titulo: limpar(elT.titulo.value),
          tipo: elT.tipo.value,
          eixo: elT.eixo.value,
          coautores: [],
          apresentador: "primeiro",
          apresentadorCpf: "",
        };
        lerCoautores().forEach(function (c) {
          dados.coautores.push({ nome: c.nome, cpf: c.cpf, email: c.email, instituicao: c.instituicao });
          if (c.numero === selApresentador.value) {
            dados.apresentador = "coautor";
            dados.apresentadorCpf = c.cpf;
          }
        });
        PARTES_RESUMO.forEach(function (nome) {
          dados[nome] = elT[nome].value.trim();
        });
        return dados;
      },
      aoLimpar: function () {
        listaCoautores.textContent = "";
        liApresentador = null;
        renumerarCoautores();
        guardarResumo();
        avisarLimite("", "");
        atualizarContador();
        atualizarTitulo();
      },
      // O trabalho novo precisa aparecer na área do inscrito
      aoConcluir: function () {
        painelAtual = null;
        return false;
      },
      aoRecusar: function (resposta) {
        if (resposta.erro !== "sessao") return false;
        fecharSessao(resposta.mensagem);
        return true;
      },
      sucesso: function (chave, dados, resposta) {
        if (chave === "protocolo") return resposta.protocolo || "enviado por e-mail";
        if (chave === "titulo") return dados.titulo || "";
        if (chave === "email") return emailDoEnvio || "o seu e-mail";
        return "";
      },
    });
    renumerarCoautores();

    // Sem sessão, o envio aberto dá lugar ao convite para entrar. Com o
    // envio em breve ou encerrado, o formulário aparece desligado, como antes.
    const caixaAcesso = document.getElementById("trb-acesso");
    const textoAcesso = document.getElementById("trb-acesso-texto");
    const textoAcessoPadrao = textoAcesso.textContent;
    const sucessoTrabalho = document.getElementById("trb-sucesso");
    function atualizarEnvio() {
      const travado = estadoSubmissao === "aberto" && !sessao;
      caixaAcesso.hidden = !travado;
      if (travado) {
        textoAcesso.textContent = avisoSessao ? avisoSessao + " " + textoAcessoPadrao : textoAcessoPadrao;
        formTrabalho.hidden = true;
        sucessoTrabalho.hidden = true;
        return;
      }
      if (sucessoTrabalho.hidden) formTrabalho.hidden = false;
      if (!sessao) return;
      const linhaAutor = document.getElementById("trb-autor");
      function mostrarAutor(r) {
        linhaAutor.querySelector('[data-autor="nome"]').textContent = r ? r.inscricao.nome : (sessao.nome || "você");
        linhaAutor.querySelector('[data-autor="protocolo"]').textContent = r ? r.inscricao.protocolo : "…";
      }
      mostrarAutor(painelAtual);
      carregarPainel(false).then(function (r) { if (r) mostrarAutor(r); });
    }
    aoMostrarPagina.submissao = atualizarEnvio;
    aoMudarSessao.push(atualizarEnvio);
    atualizarEnvio();

    // Coautores inscritos: o banco só devolve nome e instituição a quem entrou
    // e já sabe o CPF e o e-mail do coautor; o CPF sozinho não revela nada.
    const podeConferir = estadoSubmissao === "aberto";
    function chaveInscricao(cpf, email) {
      email = email.trim().toLowerCase();
      return cpfValido(cpf) && emailValido(email) ? soDigitos(cpf) + " " + email : "";
    }
    function conferir(chave) {
      const partes = chave.split(" ");
      return enviarAoBanco("conferir", { token: sessao ? sessao.token : "", cpf: mascaraCpf(partes[0]), email: partes[1] })
        .then(function (r) {
          if (r && r.erro === "sessao") {
            fecharSessao(r.mensagem);
            return null;
          }
          return r;
        })
        .catch(function () { return null; });
    }

    // Coautores inscritos: nome e instituição se preenchem a partir da inscrição.
    // Só troca o que estiver vazio ou o que a própria conferência preencheu antes.
    function preencherDaInscricao(li, parte, valor) {
      const campo = li.querySelector(".coautor__" + parte);
      const anterior = li.dataset["auto" + parte] || "";
      if (campo.value.trim() && campo.value !== anterior) return false;
      campo.value = valor;
      li.dataset["auto" + parte] = valor;
      campo.dispatchEvent(new Event("input", { bubbles: true }));
      return !!valor;
    }
    listaCoautores.addEventListener("focusout", function (e) {
      if (!podeConferir || !e.target.matches(".coautor__cpf, .coautor__email")) return;
      const li = e.target.closest(".coautor");
      const nota = li.querySelector(".coautor__nota");
      const chave = chaveInscricao(li.querySelector(".coautor__cpf").value, li.querySelector(".coautor__email").value);
      if (!chave || chave.split(" ")[0] === cpfDoAutor() || chave === li.dataset.chave) return;
      li.dataset.chave = chave;
      nota.classList.remove("is-ok");
      nota.textContent = "Conferindo a inscrição…";
      conferir(chave).then(function (r) {
        if (!li.isConnected || li.dataset.chave !== chave) return;
        if (!r) {
          nota.textContent = "";
          delete li.dataset.chave; // falha de conexão: tenta de novo na próxima vez
          return;
        }
        const achou = !!r.ok;
        const nome = preencherDaInscricao(li, "nome", achou ? r.nome : "");
        const instituicao = preencherDaInscricao(li, "instituicao", achou ? r.instituicao : "");
        nota.classList.toggle("is-ok", achou);
        if (!achou) {
          nota.textContent = "Sem inscrição com este CPF e e-mail. Preencha os dados à mão. Para apresentar o trabalho, o coautor precisa estar inscrito.";
        } else {
          nota.textContent = "Inscrito no simpósio." + (nome && instituicao ? " Nome e instituição preenchidos a partir da inscrição."
            : nome ? " Nome preenchido a partir da inscrição."
            : instituicao ? " Instituição preenchida a partir da inscrição." : "");
        }
      });
    });
    listaCoautores.addEventListener("input", function (e) {
      if (!e.target.matches(".coautor__cpf, .coautor__email")) return;
      const li = e.target.closest(".coautor");
      delete li.dataset.chave;
      li.querySelector(".coautor__nota").textContent = "";
    });
  }

  // ----- Área do inscrito: entrar, criar senha e painel -----
  const paginaArea = document.querySelector('[data-pagina="area"]');
  if (paginaArea) {
    const estadoArea = modoTeste || urlBanco ? "aberto" : "pendente";
    const vistas = {
      entrar: document.getElementById("area-entrar"),
      recuperar: document.getElementById("area-recuperar"),
      nova: document.getElementById("area-nova"),
      painel: document.getElementById("area-painel"),
    };
    const tituloArea = document.getElementById("area-titulo");
    const leadArea = document.getElementById("area-lead");
    const avisoArea = document.getElementById("area-aviso");
    const carregando = document.getElementById("area-carregando");
    const conteudo = document.getElementById("area-conteudo");
    const listaTrabalhos = document.getElementById("area-trabalhos");
    let vistaSemSessao = "entrar";
    let emailLembrado = ""; // último e-mail digitado para entrar, para a recuperação

    const CABECALHOS = {
      entrar: ["Entre na sua área", "Aqui você vê a sua inscrição e envia trabalhos. Use o e-mail da inscrição e a senha que você criou."],
      recuperar: ["Criar ou recuperar a senha", "Você recebe um código no e-mail da inscrição e cria uma senha nova."],
      nova: ["Criar ou recuperar a senha", "Digite o código que chegou no e-mail da inscrição e escolha a senha nova."],
      painel: ["Sua inscrição e seus trabalhos", "Confira os dados da inscrição e envie trabalhos pelo botão no fim da página."],
    };
    function mostrarVista(nome) {
      Object.keys(vistas).forEach(function (k) { vistas[k].hidden = k !== nome; });
      tituloArea.textContent = CABECALHOS[nome][0];
      leadArea.textContent = CABECALHOS[nome][1];
    }

    if (estadoArea !== "aberto") {
      avisoArea.textContent = "A área do inscrito abre junto com as inscrições, nesta página.";
      avisoArea.hidden = false;
    } else if (modoTeste) {
      avisoArea.textContent = urlBancoTeste
        ? "Ambiente de teste: a área do inscrito usa a planilha de testes."
        : "Modo de teste: as inscrições e senhas ficam só neste navegador. O código de \"Esqueci a senha\" aparece no Painel de teste, no canto da tela.";
      avisoArea.classList.add("inscricao__aviso--teste");
      avisoArea.hidden = false;
    }
    const textosArea = {
      botaoPendente: "Em breve",
      botaoEncerrado: "Em breve",
      avisoPendente: "",
      avisoEncerrado: "",
    };

    const formEntrar = document.getElementById("form-entrar");
    const ligacaoEntrar = ligarFormulario({
      form: formEntrar,
      prefixo: "ent",
      acao: "entrar",
      estado: estadoArea,
      textos: textosArea,
      regras: {
        email: regraEmail,
        senha: function (v) { return v ? "" : "Informe a senha."; },
      },
      coletar: function () {
        emailLembrado = formEntrar.elements.email.value.trim().toLowerCase();
        return { email: emailLembrado, senha: formEntrar.elements.senha.value };
      },
      aoConcluir: function (r) {
        abrirSessao(r.token, r.nome);
        return true;
      },
    });

    const formCodigo = document.getElementById("form-codigo");
    const formNova = document.getElementById("form-nova");
    ligarFormulario({
      form: formCodigo,
      prefixo: "cod",
      acao: "pedirCodigo",
      estado: estadoArea,
      textos: textosArea,
      regras: { email: regraEmail },
      coletar: function () {
        return { email: formCodigo.elements.email.value.trim().toLowerCase() };
      },
      aoConcluir: function (r, dados) {
        formNova.elements.email.value = dados.email;
        const enviado = document.getElementById("nov-enviado");
        enviado.textContent = r.mensagem || "";
        enviado.hidden = !r.mensagem;
        verVista("nova");
        formNova.elements.codigo.focus();
        return true;
      },
    });

    ligarFormulario({
      form: formNova,
      prefixo: "nov",
      acao: "novaSenha",
      estado: estadoArea,
      textos: textosArea,
      mascaras: { codigo: function (v) { return soDigitos(v).slice(0, 6); } },
      regras: {
        email: regraEmail,
        codigo: function (v) {
          if (!v) return "Digite o código que chegou no e-mail.";
          return soDigitos(v).length === 6 ? "" : "O código tem 6 números.";
        },
        senha: regraSenha,
        senha2: function (v) {
          if (!v) return "Repita a senha.";
          return v === formNova.elements.senha.value ? "" : "As duas senhas estão diferentes.";
        },
      },
      coletar: function () {
        return {
          email: formNova.elements.email.value.trim().toLowerCase(),
          codigo: soDigitos(formNova.elements.codigo.value),
          senha: formNova.elements.senha.value,
        };
      },
      aoConcluir: function (r) {
        document.getElementById("nov-enviado").hidden = true;
        vistaSemSessao = "entrar";
        abrirSessao(r.token, r.nome);
        return true;
      },
    });

    // Botões "Esqueci a senha", "Já tenho um código", "Voltar para entrar"
    function verVista(nome) {
      vistaSemSessao = nome;
      mostrarVista(nome);
      const email = (formEntrar.elements.email.value || emailLembrado).trim();
      if (nome === "recuperar" && email && !formCodigo.elements.email.value) formCodigo.elements.email.value = email;
      if (nome === "nova" && !formNova.elements.email.value) formNova.elements.email.value = formCodigo.elements.email.value || email;
    }
    paginaArea.querySelectorAll("[data-area-ver]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        verVista(botao.dataset.areaVer);
        const primeiro = vistas[botao.dataset.areaVer].querySelector("input:not([value])");
        if (primeiro) primeiro.focus();
      });
    });

    function preencherPainel(r) {
      const i = r.inscricao;
      const valores = {
        primeiroNome: i.nome.split(" ")[0], protocolo: i.protocolo, nome: i.nome, cpf: i.cpf, email: i.email,
        celular: i.celular, categoria: i.categoria, instituicao: i.instituicao, data: i.data,
      };
      paginaArea.querySelectorAll("[data-painel]").forEach(function (el) {
        el.textContent = valores[el.dataset.painel] || "não informado";
      });

      listaTrabalhos.textContent = "";
      r.trabalhos.forEach(function (t) {
        const li = document.createElement("li");
        li.className = "area__trabalho";
        const topo = document.createElement("p");
        topo.className = "area__trabalho-topo";
        const protocolo = document.createElement("strong");
        protocolo.textContent = t.protocolo;
        topo.appendChild(protocolo);
        topo.appendChild(document.createTextNode(t.papel + (t.data ? " · enviado em " + t.data : "")));
        const titulo = document.createElement("h3");
        titulo.textContent = t.titulo;
        const detalhes = document.createElement("p");
        detalhes.textContent = t.tipo + " · " + t.eixo + " · Apresentação: " + t.apresentador;
        li.appendChild(topo);
        li.appendChild(titulo);
        li.appendChild(detalhes);
        listaTrabalhos.appendChild(li);
      });
      document.getElementById("area-trabalhos-vazio").hidden = r.trabalhos.length > 0;

      const sub = r.submissao;
      const nota = document.getElementById("area-submissao-nota");
      const botao = document.getElementById("area-submeter");
      if (!sub.aberta) {
        nota.textContent = "O envio de trabalhos está fechado. O prazo final é " + sub.prazo + ".";
      } else if (sub.restantes < 1) {
        nota.textContent = "Você já enviou " + sub.maximo + " trabalhos como primeiro autor, o máximo do edital.";
      } else {
        nota.textContent = "Você ainda pode enviar " + sub.restantes + (sub.restantes === 1 ? " trabalho" : " trabalhos") +
          " como primeiro autor, até " + sub.prazo + ".";
      }
      botao.hidden = !sub.aberta || sub.restantes < 1;
    }

    function atualizarArea() {
      if (!sessao) {
        mostrarVista(vistaSemSessao);
        if (avisoSessao) ligacaoEntrar.definirStatus(avisoSessao, true);
        return;
      }
      mostrarVista("painel");
      if (painelAtual) {
        preencherPainel(painelAtual);
        carregando.hidden = true;
        conteudo.hidden = false;
      } else {
        carregando.textContent = "Carregando a sua inscrição…";
        carregando.hidden = false;
        conteudo.hidden = true;
      }
      carregarPainel(true).then(function (r) {
        if (!sessao) return;
        if (r) {
          preencherPainel(r);
          carregando.hidden = true;
          conteudo.hidden = false;
        } else if (!painelAtual) {
          carregando.textContent = "Não foi possível carregar a sua inscrição agora. Verifique a conexão e recarregue a página.";
        }
      });
    }

    // Link do menu e página aberta acompanham a sessão
    const linksArea = document.querySelectorAll("[data-area-link]");
    function atualizarMenuArea() {
      linksArea.forEach(function (a) { a.textContent = sessao ? "Minha área" : "Área do inscrito"; });
    }
    aoMostrarPagina.area = atualizarArea;
    aoMudarSessao.push(atualizarMenuArea);
    aoMudarSessao.push(function () {
      if (!paginaArea.hidden) {
        atualizarArea();
        window.scrollTo(0, 0);
      }
    });
    atualizarMenuArea();
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
    if (aoMostrarPagina[alvo.dataset.pagina]) aoMostrarPagina[alvo.dataset.pagina]();

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
