/* =====================================================================
   1º Simpósio de Urgência e Emergência · banco de inscrições e trabalhos
   ---------------------------------------------------------------------
   Este código roda no Google Apps Script, ligado a uma planilha do Google.
   Ele recebe os formulários do site, confere as regras do edital, grava
   cada envio numa aba da planilha e manda um e-mail de confirmação. Também
   cuida da área do inscrito: senha, entrada, sessão e recuperação de senha.

   Instalação: siga a seção "Banco de dados" do README do repositório.
   O mesmo código serve para a planilha de testes, com TESTE: true
   (README, seção "Ambiente de teste").
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
  SUBMISSAO_FIM: "2026-11-06", // último dia de envio, até 23h59 de Brasília
  RESULTADO: "16/11/2026",
  MAX_TRABALHOS_PRIMEIRO_AUTOR: 3,
  MAX_AUTORES: 8,
  MAX_CARACTERES: 2500, // resumo, sem contar os espaços
  MAX_TITULO: 200,      // título, contando os espaços

  // Área do inscrito
  SENHA_MINIMA: 8,   // caracteres
  SESSAO_HORAS: 6,   // tempo sem uso até pedir a senha de novo (máximo 6)

  // true só na cópia ligada à planilha de testes: os e-mails saem com
  // [TESTE] no assunto e um aviso de que nada foi registrado de verdade
  TESTE: false,

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
  // Senhas da área do inscrito. A senha nunca é guardada: só uma versão
  // embaralhada, que não dá para desfazer. Pode ocultar esta aba.
  acessos: {
    nome: "Acessos",
    colunas: ["E-mail", "CPF", "Senha protegida", "Criada em", "Atualizada em"],
  },
};

// Posição (começando em 0) das colunas usadas nas buscas
const COL = {
  INS_NOME: 2, INS_CPF: 3, INS_EMAIL: 4, INS_CELULAR: 5, INS_CATEGORIA: 6, INS_INSTITUICAO: 7,
  TRB_TITULO: 2, TRB_CPF: 6, TRB_COAUTORES: 8,
  ACE_EMAIL: 0, ACE_CPF: 1, ACE_SENHA: 2,
};

// Proteção das senhas e limites da área do inscrito
const ITERACOES_SENHA = 500;      // rodadas de embaralhamento de cada senha
const MAX_FALHAS_ENTRADA = 5;     // senhas erradas seguidas antes de esperar 15 minutos
const MAX_CODIGOS_POR_HORA = 3;   // códigos de recuperação por e-mail
const MAX_TENTATIVAS_CODIGO = 5;  // tentativas para acertar cada código

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
  segredoSenhas(true);
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
  return responder({ ok: true, mensagem: (CONFIG.TESTE ? "Banco de TESTE do " : "Banco do ") + CONFIG.EVENTO + " no ar." });
}

// O site envia { acao: "...", dados: {...} } em JSON. As ações que só leem
// a planilha rodam sem a trava; as que gravam esperam a vez.
const ACOES = {
  inscricao: registrarInscricao,
  trabalho: registrarTrabalho,
  novaSenha: definirNovaSenha,
  entrar: entrar,
  painel: painel,
  conferir: conferirInscricao,
  pedirCodigo: pedirCodigo,
  sair: sair,
};
const SO_LEITURA = ["entrar", "painel", "conferir", "pedirCodigo", "sair"];

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

  if (!Object.prototype.hasOwnProperty.call(ACOES, pedido.acao)) {
    return responder(falha("acao_invalida", "Tipo de envio desconhecido."));
  }
  const acao = ACOES[pedido.acao];
  const dados = pedido.dados && typeof pedido.dados === "object" ? pedido.dados : {};

  if (SO_LEITURA.indexOf(pedido.acao) >= 0) {
    try {
      return responder(acao(abrirPlanilha(), dados));
    } catch (erro) {
      console.error(erro);
      return responder(falha("erro_interno", "Não foi possível concluir agora. Tente de novo em alguns minutos."));
    }
  }

  const trava = LockService.getScriptLock();
  try {
    trava.waitLock(30000);
  } catch (erro) {
    return responder(falha("ocupado", "Muitos envios ao mesmo tempo. Aguarde alguns segundos e tente de novo."));
  }
  try {
    return responder(acao(abrirPlanilha(), dados));
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
  // Celular: DDD + 9 + 8 números
  const celular = soDigitos(d.celular);
  if (!/^[1-9]{2}9\d{8}$/.test(celular)) {
    return falha("celular", "Informe o celular com DDD e o 9 inicial, por exemplo (21) 99999-9999.", "celular");
  }
  const categoria = texto(d.categoria, 60);
  if (CATEGORIAS.indexOf(categoria) < 0) {
    return falha("categoria", "Escolha a categoria profissional.", "categoria");
  }
  const instituicao = texto(d.instituicao, 120);
  if (!instituicao) return falha("instituicao", "Informe a instituição ou unidade.", "instituicao");
  const intencao = INTENCAO_TRABALHO.indexOf(d.trabalho) >= 0 ? d.trabalho : "Não informado";
  const senha = senhaRecebida(d.senha);
  const erroSenha = conferirSenha(senha);
  if (erroSenha) return falha("senha", erroSenha, "senha");

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
  // O e-mail é o login da área do inscrito: um por inscrição
  if (registros.some(function (l) { return String(l[COL.INS_EMAIL]).trim().toLowerCase() === email; })) {
    return falha(
      "email_duplicado",
      "Este e-mail já está em outra inscrição. Cada pessoa precisa de um e-mail próprio, que também é o login da área do inscrito.",
      "email"
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
    "Para ver a sua inscrição e enviar trabalhos, entre na área do inscrito com este e-mail e a senha que você criou: " + CONFIG.SITE + "#/area",
  ]);
  folha.getRange(numeroLinha, ABAS.inscricoes.colunas.length).setValue(situacaoEmail);
  gravarAcesso(planilha, email, cpf, senha);

  return { ok: true, protocolo: protocolo, nome: primeiroNome, token: abrirSessao(cpf) };
}

/* ---------------------------------------------------------------------
   Conferência de inscrição pelo CPF e pelo e-mail
   --------------------------------------------------------------------- */

// Acha a inscrição do CPF e confere se o e-mail é o mesmo. Devolve os dados
// ou, em "recusa", a resposta que aponta o campo errado.
function buscarInscricao(planilha, d) {
  const cpf = soDigitos(d.cpf);
  if (!cpfValido(cpf)) return { recusa: falha("cpf", "Confira o CPF.", "cpf") };
  const email = texto(d.email, 120).toLowerCase();
  if (!emailValido(email)) return { recusa: falha("email", "Confira o e-mail.", "email") };

  const inscritos = linhas(aba(planilha, ABAS.inscricoes), ABAS.inscricoes.colunas.length);
  const inscricao = inscritos.filter(function (l) { return soDigitos(l[COL.INS_CPF]) === cpf; })[0];
  if (!inscricao) {
    return { recusa: falha(
      "nao_inscrito",
      "Não encontramos inscrição com este CPF. Confira os números ou faça a sua inscrição antes de enviar o trabalho.",
      "cpf"
    ) };
  }
  if (String(inscricao[COL.INS_EMAIL]).trim().toLowerCase() !== email) {
    return { recusa: falha(
      "email_diferente",
      "Este e-mail não é o da inscrição deste CPF. Use o mesmo e-mail da inscrição, o endereço que recebeu a confirmação com o número de inscrição.",
      "email"
    ) };
  }
  return { cpf: cpf, email: email, inscricao: inscricao, inscritos: inscritos };
}

// Usado no envio de trabalho, para preencher os coautores inscritos. Só
// responde a quem entrou na área do inscrito, e só com o nome e a
// instituição de quem tem o CPF e o e-mail informados.
function conferirInscricao(planilha, d) {
  if (!cpfDaSessao(d.token)) return semSessao();
  const achado = buscarInscricao(planilha, d);
  if (achado.recusa) return achado.recusa;
  return {
    ok: true,
    nome: String(achado.inscricao[COL.INS_NOME]),
    instituicao: String(achado.inscricao[COL.INS_INSTITUICAO]),
  };
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

  // Quem envia é o primeiro autor, que entrou na área do inscrito
  const cpf = cpfDaSessao(d.token);
  if (!cpf) return semSessao();
  const inscritos = linhas(aba(planilha, ABAS.inscricoes), ABAS.inscricoes.colunas.length);
  const inscricao = inscritos.filter(function (l) { return soDigitos(l[COL.INS_CPF]) === cpf; })[0];
  if (!inscricao) return semSessao();
  const email = String(inscricao[COL.INS_EMAIL]).trim().toLowerCase();

  const titulo = texto(d.titulo, 1000);
  if (!titulo) return falha("titulo", "Informe o título do trabalho.", "titulo");
  if (titulo.length > CONFIG.MAX_TITULO) {
    return falha("titulo", "O título pode ter até " + CONFIG.MAX_TITULO + " caracteres, contando os espaços.", "titulo");
  }
  const tipo = texto(d.tipo, 60);
  if (TIPOS.indexOf(tipo) < 0) return falha("tipo", "Escolha o tipo de trabalho.", "tipo");
  const eixo = texto(d.eixo, 80);
  if (EIXOS.indexOf(eixo) < 0) return falha("eixo", "Escolha o eixo temático.", "eixo");

  // Coautores: nome completo, CPF e e-mail obrigatórios; instituição opcional
  const coautores = (Array.isArray(d.coautores) ? d.coautores : [])
    .map(function (c) {
      return {
        nome: texto(c && c.nome, 120),
        cpf: soDigitos(c && c.cpf),
        email: texto(c && c.email, 120).toLowerCase(),
        instituicao: texto(c && c.instituicao, 120),
      };
    })
    .filter(function (c) { return c.nome || c.cpf || c.email || c.instituicao; });
  if (coautores.length + 1 > CONFIG.MAX_AUTORES) {
    return falha("coautores", "Cada trabalho pode ter até " + CONFIG.MAX_AUTORES + " autores, somando autores e coautores.", "coautores");
  }
  if (coautores.some(function (c) { return c.nome.split(" ").length < 2 || !cpfValido(c.cpf) || !emailValido(c.email); })) {
    return falha("coautores", "Informe nome completo, CPF válido e e-mail de cada coautor.", "coautores");
  }
  const cpfsAutores = [cpf].concat(coautores.map(function (c) { return c.cpf; }));
  if (cpfsAutores.some(function (c, i) { return cpfsAutores.indexOf(c) !== i; })) {
    return falha("coautores", "O mesmo CPF aparece em mais de um autor.", "coautores");
  }

  let apresentador = inscricao[COL.INS_NOME];
  let cpfApresentador = formatarCpf(cpf);
  if (d.apresentador === "coautor") {
    const cpfA = soDigitos(d.apresentadorCpf);
    const coautorA = coautores.filter(function (c) { return c.cpf === cpfA; })[0];
    if (!coautorA) {
      return falha("apresentador", "Escolha como apresentador um dos coautores informados.", "apresentador");
    }
    const inscricaoA = inscritos.filter(function (l) { return soDigitos(l[COL.INS_CPF]) === cpfA; })[0];
    if (!inscricaoA) {
      return falha(
        "apresentador_nao_inscrito",
        coautorA.nome + " precisa estar inscrito(a) no simpósio para apresentar. Não encontramos inscrição com o CPF informado.",
        "apresentador"
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
    return (i + 2) + ". " + c.nome + " · CPF " + formatarCpf(c.cpf) + " · " + c.email + (c.instituicao ? " · " + c.instituicao : "");
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
   Área do inscrito: entrada, painel, senha e sessão
   --------------------------------------------------------------------- */
function entrar(planilha, d) {
  const email = texto(d.email, 120).toLowerCase();
  if (!emailValido(email)) return falha("email", "Confira o e-mail.", "email");
  const senha = senhaRecebida(d.senha);
  if (!senha) return falha("senha", "Informe a senha.", "senha");

  const cache = CacheService.getScriptCache();
  const chaveFalhas = "falhas:" + resumo(email);
  const falhas = Number(cache.get(chaveFalhas) || 0);
  if (falhas >= MAX_FALHAS_ENTRADA) {
    return falha("bloqueado", "Muitas tentativas erradas com este e-mail. Aguarde 15 minutos ou crie uma nova senha em \"Esqueci a senha\".");
  }
  const acesso = buscarAcesso(planilha, email);
  const cpf = acesso ? soDigitos(acesso[COL.ACE_CPF]) : "";
  const inscricao = cpf ? inscricaoPor(planilha, COL.INS_CPF, cpf) : null;
  if (!inscricao || !senhaConfere(senha, acesso[COL.ACE_SENHA])) {
    cache.put(chaveFalhas, String(falhas + 1), 900);
    return falha(
      "credenciais",
      "E-mail ou senha incorretos. Se esqueceu a senha, ou se fez a inscrição antes de existir a área do inscrito, use \"Esqueci a senha\".",
      "senha"
    );
  }
  cache.remove(chaveFalhas);
  return { ok: true, token: abrirSessao(cpf), nome: String(inscricao[COL.INS_NOME]).split(" ")[0] };
}

// Dados da inscrição e trabalhos de quem entrou
function painel(planilha, d) {
  const cpf = cpfDaSessao(d.token);
  if (!cpf) return semSessao();
  const inscricao = inscricaoPor(planilha, COL.INS_CPF, cpf);
  if (!inscricao) return semSessao();

  const marcaCoautor = "CPF " + formatarCpf(cpf);
  const trabalhos = linhas(aba(planilha, ABAS.trabalhos), ABAS.trabalhos.colunas.length)
    .filter(function (l) {
      return soDigitos(l[COL.TRB_CPF]) === cpf || String(l[COL.TRB_COAUTORES]).indexOf(marcaCoautor) >= 0;
    })
    .map(function (l) {
      return {
        protocolo: String(l[0]), data: dataHora(l[1]), titulo: String(l[COL.TRB_TITULO]),
        tipo: String(l[3]), eixo: String(l[4]), apresentador: String(l[10]),
        papel: soDigitos(l[COL.TRB_CPF]) === cpf ? "Primeiro autor" : "Coautor",
      };
    });
  const comoPrimeiro = trabalhos.filter(function (t) { return t.papel === "Primeiro autor"; }).length;

  return {
    ok: true,
    inscricao: {
      protocolo: String(inscricao[0]), data: dataHora(inscricao[1]), nome: String(inscricao[COL.INS_NOME]),
      cpf: formatarCpf(cpf), email: String(inscricao[COL.INS_EMAIL]), celular: String(inscricao[COL.INS_CELULAR]),
      categoria: String(inscricao[COL.INS_CATEGORIA]), instituicao: String(inscricao[COL.INS_INSTITUICAO]),
    },
    trabalhos: trabalhos,
    submissao: {
      aberta: dentroDoPeriodo(CONFIG.SUBMISSAO_INICIO, CONFIG.SUBMISSAO_FIM),
      prazo: CONFIG.SUBMISSAO_FIM.split("-").reverse().join("/"),
      maximo: CONFIG.MAX_TRABALHOS_PRIMEIRO_AUTOR,
      restantes: Math.max(0, CONFIG.MAX_TRABALHOS_PRIMEIRO_AUTOR - comoPrimeiro),
    },
  };
}

// Manda um código de 6 números para criar ou trocar a senha. A resposta é a
// mesma com ou sem inscrição, para não revelar quem está inscrito.
function pedirCodigo(planilha, d) {
  const email = texto(d.email, 120).toLowerCase();
  if (!emailValido(email)) return falha("email", "Confira o e-mail.", "email");

  const cache = CacheService.getScriptCache();
  const chaveEnvios = "envios:" + resumo(email);
  const envios = Number(cache.get(chaveEnvios) || 0);
  if (envios >= MAX_CODIGOS_POR_HORA) {
    return falha("muitos_codigos", "Já enviamos " + MAX_CODIGOS_POR_HORA + " códigos para este e-mail há pouco. Use o código mais recente ou aguarde uma hora.");
  }
  cache.put(chaveEnvios, String(envios + 1), 3600);

  const inscricao = inscricaoPor(planilha, COL.INS_EMAIL, email);
  if (inscricao) {
    const numeros = parseInt(Utilities.getUuid().replace(/-/g, "").slice(0, 12), 16);
    const codigo = String(numeros % 1000000).padStart(6, "0");
    cache.put("codigo:" + resumo(email), JSON.stringify({ h: resumo(codigo + ":" + email), n: 0 }), 1800);
    enviarEmail(email, "Código para a sua senha · " + CONFIG.EVENTO, [
      "Olá, " + String(inscricao[COL.INS_NOME]).split(" ")[0] + ".",
      "Use este código para criar ou trocar a senha da área do inscrito: " + codigo,
      "O código vale por 30 minutos. Se você não pediu, ignore este e-mail: a sua senha continua a mesma.",
    ]);
  }
  return { ok: true, mensagem: "Se houver inscrição com este e-mail, enviamos um código de 6 números. Ele vale por 30 minutos." };
}

function definirNovaSenha(planilha, d) {
  const email = texto(d.email, 120).toLowerCase();
  if (!emailValido(email)) return falha("email", "Confira o e-mail.", "email");
  const codigo = soDigitos(d.codigo);
  if (codigo.length !== 6) return falha("codigo", "O código tem 6 números.", "codigo");
  const senha = senhaRecebida(d.senha);
  const erroSenha = conferirSenha(senha);
  if (erroSenha) return falha("senha", erroSenha, "senha");

  const cache = CacheService.getScriptCache();
  const chave = "codigo:" + resumo(email);
  let guardado = null;
  try {
    guardado = JSON.parse(cache.get(chave) || "null");
  } catch (erro) {
    guardado = null;
  }
  if (!guardado || guardado.n >= MAX_TENTATIVAS_CODIGO) {
    cache.remove(chave);
    return falha("codigo_vencido", "Código vencido ou inválido. Peça um novo código.", "codigo");
  }
  if (guardado.h !== resumo(codigo + ":" + email)) {
    guardado.n++;
    cache.put(chave, JSON.stringify(guardado), 1800);
    return falha("codigo", "Código incorreto. Confira os 6 números do e-mail mais recente.", "codigo");
  }
  cache.remove(chave);

  const inscricao = inscricaoPor(planilha, COL.INS_EMAIL, email);
  if (!inscricao) return falha("codigo_vencido", "Código vencido ou inválido. Peça um novo código.", "codigo");
  const cpf = soDigitos(inscricao[COL.INS_CPF]);
  gravarAcesso(planilha, email, cpf, senha);
  cache.remove("falhas:" + resumo(email));
  return { ok: true, token: abrirSessao(cpf), nome: String(inscricao[COL.INS_NOME]).split(" ")[0] };
}

function sair(_planilha, d) {
  if (typeof d.token === "string" && d.token) CacheService.getScriptCache().remove("sessao:" + resumo(d.token));
  return { ok: true };
}

// ----- Sessão: um código aleatório guardado no cache por algumas horas -----
function abrirSessao(cpf) {
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
  CacheService.getScriptCache().put("sessao:" + resumo(token), cpf, segundosDeSessao());
  return token;
}

// CPF de quem está com a sessão aberta; "" se ela não existe ou venceu.
// Cada uso renova o prazo.
function cpfDaSessao(token) {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) return "";
  const cache = CacheService.getScriptCache();
  const chave = "sessao:" + resumo(token);
  const cpf = cache.get(chave);
  if (cpf) cache.put(chave, cpf, segundosDeSessao());
  return cpf || "";
}

function segundosDeSessao() {
  return Math.min(21600, Math.max(1, CONFIG.SESSAO_HORAS) * 3600);
}

function semSessao() {
  return falha("sessao", "Sua sessão terminou. Entre de novo na área do inscrito.");
}

// ----- Senhas -----
function senhaRecebida(valor) {
  return typeof valor === "string" ? valor : "";
}

function conferirSenha(senha) {
  if (senha.length < CONFIG.SENHA_MINIMA) return "A senha precisa ter pelo menos " + CONFIG.SENHA_MINIMA + " caracteres.";
  if (senha.length > 100) return "A senha pode ter até 100 caracteres.";
  return "";
}

// Grava "rodadas$sal$resultado". O segredo fica nas propriedades do script,
// fora da planilha; sem ele, a aba Acessos não serve para descobrir senhas.
function protegerSenha(senha, sal, rodadas) {
  const segredo = segredoSenhas(false);
  if (!segredo) return "";
  let h = sal + ":" + senha;
  for (let i = 0; i < rodadas; i++) h = hex(Utilities.computeHmacSha256Signature(h, segredo));
  return rodadas + "$" + sal + "$" + h;
}

function senhaConfere(senha, guardada) {
  const partes = String(guardada || "").split("$");
  if (partes.length !== 3 || !(Number(partes[0]) > 0)) return false;
  const calculada = protegerSenha(senha, partes[1], Number(partes[0]));
  return !!calculada && calculada === String(guardada);
}

// Não apague a propriedade SEGREDO_SENHAS: sem ela, nenhuma senha confere.
function segredoSenhas(criar) {
  const props = PropertiesService.getScriptProperties();
  let segredo = props.getProperty("SEGREDO_SENHAS");
  if (!segredo && criar) {
    segredo = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
    props.setProperty("SEGREDO_SENHAS", segredo);
  }
  return segredo || "";
}

// Cria ou troca a senha do e-mail. Chamada só por ações que rodam com a trava.
function gravarAcesso(planilha, email, cpf, senha) {
  segredoSenhas(true);
  const protegida = protegerSenha(senha, Utilities.getUuid().replace(/-/g, ""), ITERACOES_SENHA);
  const folha = aba(planilha, ABAS.acessos);
  const registros = linhas(folha, ABAS.acessos.colunas.length);
  for (let i = 0; i < registros.length; i++) {
    if (String(registros[i][COL.ACE_EMAIL]).trim().toLowerCase() === email) {
      folha.getRange(i + 2, 2, 1, 2).setValues([[formatarCpf(cpf), protegida]]);
      folha.getRange(i + 2, 5).setValue(new Date());
      return;
    }
  }
  folha.appendRow(protegerLinha([email, formatarCpf(cpf), protegida, new Date(), new Date()]));
}

function buscarAcesso(planilha, email) {
  return linhas(aba(planilha, ABAS.acessos), ABAS.acessos.colunas.length).filter(function (l) {
    return String(l[COL.ACE_EMAIL]).trim().toLowerCase() === email;
  })[0] || null;
}

// Primeira inscrição com o CPF ou o e-mail informado
function inscricaoPor(planilha, coluna, valor) {
  return linhas(aba(planilha, ABAS.inscricoes), ABAS.inscricoes.colunas.length).filter(function (l) {
    return coluna === COL.INS_CPF ? soDigitos(l[coluna]) === valor : String(l[coluna]).trim().toLowerCase() === valor;
  })[0] || null;
}

function resumo(texto) {
  return hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto), Utilities.Charset.UTF_8));
}

function hex(bytes) {
  return bytes.map(function (b) { return ((b & 0xff) + 0x100).toString(16).slice(1); }).join("");
}

function dataHora(valor) {
  return Object.prototype.toString.call(valor) === "[object Date]"
    ? Utilities.formatDate(valor, CONFIG.FUSO, "dd/MM/yyyy HH:mm")
    : String(valor || "");
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
  if (CONFIG.TESTE) {
    assunto = "[TESTE] " + assunto;
    paragrafos = ["Este e-mail veio do ambiente de teste do site. Nenhuma inscrição ou trabalho foi registrado de verdade."].concat(paragrafos);
  }
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
