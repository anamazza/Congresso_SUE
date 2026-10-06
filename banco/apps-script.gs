/* =====================================================================
   1º Simpósio de Urgência e Emergência · banco de inscrições e trabalhos
   ---------------------------------------------------------------------
   Este código roda no Google Apps Script, ligado a uma planilha do Google.
   Ele recebe os dois formulários do site, confere as regras do edital,
   grava cada envio numa aba da planilha e manda um e-mail de confirmação.

   Instalação: siga a seção "Banco de dados" do README do repositório.
   Depois de qualquer mudança neste código, publique uma nova versão em
   Implantar > Gerenciar implantações > Editar > Versão: Nova versão.
   ===================================================================== */

const CONFIG = {
  EVENTO: "1º Simpósio de Urgência e Emergência",
  DATAS: "3 e 4 de dezembro de 2026",
  LOCAL: "UNIGRANRIO, Campus Barra da Tijuca, Rio de Janeiro",
  SITE: "https://diid.subhue.org/static-html/congresso-sue/",
  FUSO: "America/Sao_Paulo",

  // Inscrições. Datas no formato AAAA-MM-DD. Vazio = sem data.
  INSCRICOES_INICIO: "2026-10-06",
  INSCRICOES_FIM: "2026-11-30", // último dia, até 23h59 de Brasília
  VAGAS: 0, // número máximo de inscrições. 0 = sem limite automático

  // Trabalhos
  SUBMISSAO_INICIO: "2026-09-25",
  SUBMISSAO_FIM: "2026-10-31", // último dia de envio, até 23h59 de Brasília
  RESULTADO: "16/11/2026",
  MAX_TRABALHOS_PRIMEIRO_AUTOR: 3,
  MAX_AUTORES: 10,
  MAX_CARACTERES: 2050,

  // E-mails de confirmação
  ENVIAR_EMAIL: true,
  EMAIL_RESPOSTA: "", // e-mail da organização que recebe as respostas dos participantes
};

const ABAS = {
  inscricoes: {
    nome: "Inscrições",
    colunas: [
      "Protocolo", "Data e hora", "Nome completo", "CPF", "E-mail", "Celular",
      "Categoria profissional", "Instituição ou unidade", "Pretende submeter trabalho",
      "E-mail de confirmação",
    ],
  },
  trabalhos: {
    nome: "Trabalhos",
    colunas: [
      "Protocolo", "Data e hora", "Título", "Tipo de trabalho", "Eixo temático",
      "Primeiro autor", "CPF do primeiro autor", "E-mail do primeiro autor", "Coautores",
      "Total de autores", "Apresentador", "CPF do apresentador", "Introdução", "Métodos",
      "Resultados", "Conclusões", "Caracteres sem espaços", "Avaliação", "E-mail de confirmação",
    ],
  },
};

// Posição (começando em 0) das colunas usadas nas buscas
const COL = { INS_NOME: 2, INS_CPF: 3, INS_EMAIL: 4, TRB_TITULO: 2, TRB_CPF: 6 };

const CATEGORIAS = [
  "Médico(a)", "Enfermeiro(a)", "Técnico(a) ou auxiliar de enfermagem", "Fisioterapeuta",
  "Farmacêutico(a)", "Psicólogo(a)", "Assistente social", "Outra categoria da saúde",
  "Gestor(a) de serviço de saúde", "Residente", "Estudante", "Outra área",
];
const INTENCAO_TRABALHO = ["Sim", "Não", "Ainda não sei"];
const TIPOS = [
  "Estudo original observacional", "Estudo original de intervenção",
  "Relato de caso", "Revisão sistemática",
];
const EIXOS = [
  "Emergências clínicas do adulto",
  "Emergências pediátricas",
  "Trauma, queimaduras e emergências cirúrgicas",
  "Ressuscitação, via aérea e suporte ao paciente crítico",
  "Saúde mental, intoxicações e emergências comportamentais",
];
const PARTES_RESUMO = ["introducao", "metodos", "resultados", "conclusoes"];

/* ---------------------------------------------------------------------
   Instalação: rode esta função uma vez pelo editor (botão Executar).
   --------------------------------------------------------------------- */
function configurar() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty("PLANILHA_ID", planilha.getId());
  Object.keys(ABAS).forEach(function (chave) {
    prepararAba(planilha, ABAS[chave]);
  });
  console.log("Pronto. Abas criadas na planilha \"" + planilha.getName() + "\". Agora publique como app da Web.");
}

function prepararAba(planilha, aba) {
  let folha = planilha.getSheetByName(aba.nome);
  if (!folha) folha = planilha.insertSheet(aba.nome);
  folha.getRange(1, 1, 1, aba.colunas.length)
    .setValues([aba.colunas])
    .setFontWeight("bold")
    .setBackground("#1B1F2A")
    .setFontColor("#FFFFFF");
  folha.setFrozenRows(1);
  return folha;
}

function abrirPlanilha() {
  const id = PropertiesService.getScriptProperties().getProperty("PLANILHA_ID");
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function aba(planilha, definicao) {
  return planilha.getSheetByName(definicao.nome) || prepararAba(planilha, definicao);
}

/* ---------------------------------------------------------------------
   Entrada do app da Web
   --------------------------------------------------------------------- */

// Abrir o endereço /exec no navegador mostra se o banco está no ar.
function doGet() {
  return responder({ ok: true, mensagem: "Banco do " + CONFIG.EVENTO + " no ar." });
}

// O site envia { acao: "inscricao" | "trabalho", dados: {...} } em JSON.
function doPost(e) {
  let pedido;
  try {
    pedido = JSON.parse((e && e.postData && e.postData.contents) || "");
  } catch (erro) {
    return responder(falha("pedido_invalido", "Não foi possível ler os dados enviados."));
  }
  if (!pedido || typeof pedido !== "object") {
    return responder(falha("pedido_invalido", "Não foi possível ler os dados enviados."));
  }

  const trava = LockService.getScriptLock();
  try {
    trava.waitLock(30000);
  } catch (erro) {
    return responder(falha("ocupado", "Muitos envios ao mesmo tempo. Aguarde alguns segundos e tente de novo."));
  }
  try {
    const planilha = abrirPlanilha();
    const dados = pedido.dados && typeof pedido.dados === "object" ? pedido.dados : {};
    if (pedido.acao === "inscricao") return responder(registrarInscricao(planilha, dados));
    if (pedido.acao === "trabalho") return responder(registrarTrabalho(planilha, dados));
    return responder(falha("acao_invalida", "Tipo de envio desconhecido."));
  } catch (erro) {
    console.error(erro);
    return responder(falha("erro_interno", "Não foi possível gravar os dados agora. Tente de novo em alguns minutos."));
  } finally {
    trava.releaseLock();
  }
}

/* ---------------------------------------------------------------------
   Inscrição
   --------------------------------------------------------------------- */
function registrarInscricao(planilha, d) {
  if (!dentroDoPeriodo(CONFIG.INSCRICOES_INICIO, CONFIG.INSCRICOES_FIM)) {
    return falha("fora_do_prazo", "As inscrições não estão abertas neste momento.");
  }

  const nome = texto(d.nome, 120);
  if (nome.split(" ").length < 2) return falha("nome", "Informe o nome completo.", "nome");
  const cpf = soDigitos(d.cpf);
  if (!cpfValido(cpf)) return falha("cpf", "Confira o CPF.", "cpf");
  const email = texto(d.email, 120).toLowerCase();
  if (!emailValido(email)) return falha("email", "Confira o e-mail.", "email");
  const celular = soDigitos(d.celular);
  if (celular.length !== 10 && celular.length !== 11) {
    return falha("celular", "Informe o celular com DDD.", "celular");
  }
  const categoria = texto(d.categoria, 60);
  if (CATEGORIAS.indexOf(categoria) < 0) {
    return falha("categoria", "Escolha a categoria profissional.", "categoria");
  }
  const instituicao = texto(d.instituicao, 120);
  if (!instituicao) return falha("instituicao", "Informe a instituição ou unidade.", "instituicao");
  const intencao = INTENCAO_TRABALHO.indexOf(d.trabalho) >= 0 ? d.trabalho : "Não informado";

  const folha = aba(planilha, ABAS.inscricoes);
  const registros = linhas(folha, ABAS.inscricoes.colunas.length);
  const existente = registros.filter(function (l) { return soDigitos(l[COL.INS_CPF]) === cpf; })[0];
  if (existente) {
    return falha(
      "cpf_duplicado",
      "Este CPF já está inscrito no simpósio, com o número " + existente[0] +
        ". Para corrigir algum dado, fale com a organização.",
      "cpf"
    );
  }
  if (CONFIG.VAGAS > 0 && registros.length >= CONFIG.VAGAS) {
    return falha("vagas_esgotadas", "As vagas do simpósio se esgotaram.");
  }

  const protocolo = proximoProtocolo("INS", registros);
  folha.appendRow(protegerLinha([
    protocolo, new Date(), nome, formatarCpf(cpf), email, formatarCelular(celular),
    categoria, instituicao, intencao, "",
  ]));
  const numeroLinha = folha.getLastRow();

  const primeiroNome = nome.split(" ")[0];
  const situacaoEmail = enviarEmail(email, "Inscrição recebida · " + CONFIG.EVENTO, [
    "Olá, " + primeiroNome + ".",
    "Recebemos a sua inscrição no " + CONFIG.EVENTO + ", nos dias " + CONFIG.DATAS + ", na " + CONFIG.LOCAL + ".",
    "Número de inscrição: " + protocolo,
    "As vagas são limitadas e preenchidas por ordem de inscrição. A organização vai enviar as orientações sobre a confirmação da sua participação.",
    "Se for submeter trabalho, use o mesmo CPF e o mesmo e-mail desta inscrição na área do inscrito do site.",
  ]);
  folha.getRange(numeroLinha, ABAS.inscricoes.colunas.length).setValue(situacaoEmail);

  return { ok: true, protocolo: protocolo, nome: primeiroNome };
}

/* ---------------------------------------------------------------------
   Trabalho
   --------------------------------------------------------------------- */
function registrarTrabalho(planilha, d) {
  const agora = hoje();
  if (CONFIG.SUBMISSAO_INICIO && agora < CONFIG.SUBMISSAO_INICIO) {
    return falha("fora_do_prazo", "O envio de trabalhos ainda não começou.");
  }
  if (CONFIG.SUBMISSAO_FIM && agora > CONFIG.SUBMISSAO_FIM) {
    return falha("fora_do_prazo", "O prazo de envio de trabalhos está encerrado.");
  }

  // Quem envia é o primeiro autor, identificado pelo CPF e pelo e-mail da inscrição
  const cpf = soDigitos(d.cpf);
  if (!cpfValido(cpf)) return falha("cpf", "Confira o CPF.", "cpf");
  const email = texto(d.email, 120).toLowerCase();
  if (!emailValido(email)) return falha("email", "Confira o e-mail.", "email");

  const inscritos = linhas(aba(planilha, ABAS.inscricoes), ABAS.inscricoes.colunas.length);
  const inscricao = inscritos.filter(function (l) { return soDigitos(l[COL.INS_CPF]) === cpf; })[0];
  if (!inscricao || String(inscricao[COL.INS_EMAIL]).trim().toLowerCase() !== email) {
    return falha(
      "nao_inscrito",
      "Não encontramos uma inscrição com este CPF e este e-mail. Confira os dados ou faça a sua inscrição antes de enviar o trabalho.",
      "cpf"
    );
  }

  const titulo = texto(d.titulo, 250);
  if (!titulo) return falha("titulo", "Informe o título do trabalho.", "titulo");
  const tipo = texto(d.tipo, 60);
  if (TIPOS.indexOf(tipo) < 0) return falha("tipo", "Escolha o tipo de trabalho.", "tipo");
  const eixo = texto(d.eixo, 80);
  if (EIXOS.indexOf(eixo) < 0) return falha("eixo", "Escolha o eixo temático.", "eixo");

  const coautores = (Array.isArray(d.coautores) ? d.coautores : [])
    .map(function (c) {
      return { nome: texto(c && c.nome, 120), instituicao: texto(c && c.instituicao, 120) };
    })
    .filter(function (c) { return c.nome || c.instituicao; });
  if (coautores.some(function (c) { return c.nome.split(" ").length < 2 || !c.instituicao; })) {
    return falha("coautores", "Informe o nome completo e a instituição de cada coautor.", "coautores");
  }
  if (coautores.length + 1 > CONFIG.MAX_AUTORES) {
    return falha("coautores", "Cada trabalho pode ter até " + CONFIG.MAX_AUTORES + " autores, somando autores e coautores.", "coautores");
  }

  let apresentador = inscricao[COL.INS_NOME];
  let cpfApresentador = formatarCpf(cpf);
  if (d.apresentador === "coautor") {
    const cpfA = soDigitos(d.apresentadorCpf);
    if (!cpfValido(cpfA)) return falha("apresentador", "Confira o CPF de quem vai apresentar.", "apresentadorCpf");
    const inscricaoA = inscritos.filter(function (l) { return soDigitos(l[COL.INS_CPF]) === cpfA; })[0];
    if (!inscricaoA) {
      return falha(
        "apresentador_nao_inscrito",
        "Quem apresenta o trabalho também precisa estar inscrito no simpósio. Não encontramos inscrição com este CPF.",
        "apresentadorCpf"
      );
    }
    apresentador = inscricaoA[COL.INS_NOME];
    cpfApresentador = formatarCpf(cpfA);
  }

  const partes = PARTES_RESUMO.map(function (chave) { return textoLongo(d[chave], 4000); });
  const vazia = PARTES_RESUMO.filter(function (_c, i) { return !partes[i]; })[0];
  if (vazia) return falha("resumo_incompleto", "Preencha as quatro partes do resumo.", vazia);
  const caracteres = partes.join("").replace(/\s/g, "").length;
  if (caracteres > CONFIG.MAX_CARACTERES) {
    return falha(
      "resumo_longo",
      "O resumo tem " + caracteres + " caracteres sem espaços. O limite é " + CONFIG.MAX_CARACTERES + ".",
      "resumo"
    );
  }

  const folha = aba(planilha, ABAS.trabalhos);
  const trabalhos = linhas(folha, ABAS.trabalhos.colunas.length);
  const doAutor = trabalhos.filter(function (l) { return soDigitos(l[COL.TRB_CPF]) === cpf; });
  const repetido = doAutor.filter(function (l) {
    return String(l[COL.TRB_TITULO]).trim().toLowerCase() === titulo.toLowerCase();
  })[0];
  if (repetido) {
    return falha("trabalho_repetido", "Este trabalho já foi enviado, com o protocolo " + repetido[0] + ".");
  }
  if (doAutor.length >= CONFIG.MAX_TRABALHOS_PRIMEIRO_AUTOR) {
    return falha(
      "limite_trabalhos",
      "Você já enviou " + doAutor.length + " trabalhos como primeiro autor, o máximo permitido pelo edital."
    );
  }

  const protocolo = proximoProtocolo("TRB", trabalhos);
  const listaCoautores = coautores.map(function (c, i) {
    return (i + 2) + ". " + c.nome + " · " + c.instituicao;
  }).join("\n");
  folha.appendRow(protegerLinha([
    protocolo, new Date(), titulo, tipo, eixo, inscricao[COL.INS_NOME], formatarCpf(cpf), email,
    listaCoautores, coautores.length + 1, apresentador, cpfApresentador,
    partes[0], partes[1], partes[2], partes[3], caracteres, "", "",
  ]));
  const numeroLinha = folha.getLastRow();

  const primeiroNome = String(inscricao[COL.INS_NOME]).split(" ")[0];
  const situacaoEmail = enviarEmail(email, "Trabalho recebido · " + protocolo + " · " + CONFIG.EVENTO, [
    "Olá, " + primeiroNome + ".",
    "Recebemos o trabalho \"" + titulo + "\" para o " + CONFIG.EVENTO + ".",
    "Protocolo: " + protocolo,
    "Tipo: " + tipo + ". Eixo temático: " + eixo + ". Apresentador: " + apresentador + ".",
    "O resumo tem " + caracteres + " caracteres sem espaços.",
    "O resultado final da avaliação será divulgado em " + CONFIG.RESULTADO + ".",
  ]);
  folha.getRange(numeroLinha, ABAS.trabalhos.colunas.length).setValue(situacaoEmail);

  return { ok: true, protocolo: protocolo, titulo: titulo, caracteres: caracteres, apresentador: apresentador };
}

/* ---------------------------------------------------------------------
   Apoio
   --------------------------------------------------------------------- */
function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

function falha(erro, mensagem, campo) {
  const resposta = { ok: false, erro: erro, mensagem: mensagem };
  if (campo) resposta.campo = campo;
  return resposta;
}

function texto(valor, maximo) {
  return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim().slice(0, maximo);
}

function textoLongo(valor, maximo) {
  return String(valor == null ? "" : valor)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maximo);
}

function soDigitos(valor) {
  return String(valor == null ? "" : valor).replace(/\D/g, "");
}

function cpfValido(d) {
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(d[t])) return false;
  }
  return true;
}

function formatarCpf(d) {
  return d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6, 9) + "-" + d.slice(9, 11);
}

function formatarCelular(d) {
  const resto = d.slice(2);
  const corte = resto.length > 8 ? 5 : 4;
  return "(" + d.slice(0, 2) + ") " + resto.slice(0, corte) + "-" + resto.slice(corte);
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// Impede que um texto começado por = + - @ vire fórmula na planilha
function protegerLinha(valores) {
  return valores.map(function (v) {
    return typeof v === "string" && /^[=+\-@]/.test(v) ? "'" + v : v;
  });
}

function hoje() {
  return Utilities.formatDate(new Date(), CONFIG.FUSO, "yyyy-MM-dd");
}

function dentroDoPeriodo(inicio, fim) {
  const d = hoje();
  return (!inicio || d >= inicio) && (!fim || d <= fim);
}

function linhas(folha, nColunas) {
  const n = folha.getLastRow() - 1;
  return n > 0 ? folha.getRange(2, 1, n, nColunas).getValues() : [];
}

function proximoProtocolo(prefixo, registros) {
  let maior = 0;
  registros.forEach(function (l) {
    const m = String(l[0]).match(/(\d+)$/);
    if (m) maior = Math.max(maior, Number(m[1]));
  });
  return prefixo + "-" + String(maior + 1).padStart(4, "0");
}

function escaparHtml(t) {
  return String(t).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
  });
}

function enviarEmail(para, assunto, paragrafos) {
  if (!CONFIG.ENVIAR_EMAIL) return "desligado";
  try {
    if (MailApp.getRemainingDailyQuota() < 1) return "não enviado: limite diário de e-mails";
    const rodape = CONFIG.EVENTO + " · " + CONFIG.SITE;
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#2B3140;max-width:560px">' +
      '<div style="height:5px;background:linear-gradient(90deg,#880A12,#404058,#0078A0);background-color:#880A12"></div>' +
      '<div style="padding:20px 4px">' +
      paragrafos.map(function (p) { return '<p style="margin:0 0 14px">' + escaparHtml(p) + "</p>"; }).join("") +
      '<p style="margin:24px 0 0;font-size:13px;color:#5E6675">' + escaparHtml(rodape) + "</p>" +
      "</div></div>";
    const mensagem = {
      to: para,
      subject: assunto,
      body: paragrafos.join("\n\n") + "\n\n" + rodape,
      htmlBody: html,
      name: CONFIG.EVENTO,
    };
    if (CONFIG.EMAIL_RESPOSTA) mensagem.replyTo = CONFIG.EMAIL_RESPOSTA;
    MailApp.sendEmail(mensagem);
    return "enviado";
  } catch (erro) {
    console.error(erro);
    return "não enviado: " + (erro && erro.message ? erro.message : erro);
  }
}
