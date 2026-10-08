/* =====================================================================
   Testes das regras (servidor/src/regras.js), rodados duas vezes: com o
   repositório em memória (o do navegador) e com o SQLite (o do servidor).

   Uso:  node servidor/testes/regras.test.js
   ===================================================================== */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const regras = require("../src/regras.js");
const { criarRepoMemoria } = require("../src/repo-memoria.js");
const { criarRepoSqlite } = require("../src/repo-sqlite.js");
const senhas = require("../src/senhas.js");

const CPFS = ["529.982.247-25", "111.444.777-35", "935.411.347-80", "123.456.789-09"];
const SENHA = "senha da Maria 1";
const ORG = "org@exemplo.com";

function gerarCpf(base) {
  const d = String(base).padStart(9, "0").split("").map(Number);
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += d[i] * (t + 1 - i);
    d.push(((soma * 10) % 11) % 10);
  }
  const x = d.join("");
  return x.slice(0, 3) + "." + x.slice(3, 6) + "." + x.slice(6, 9) + "-" + x.slice(9);
}
function coautor(n, extra) {
  return Object.assign({ nome: "Coautor Número" + n, cpf: gerarCpf(200000000 + n), email: "coautor" + n + "@exemplo.com", instituicao: "Unidade " + n }, extra);
}
function inscricao(extra) {
  return Object.assign({
    nome: "Maria da Silva", cpf: CPFS[0], email: "maria@exemplo.com", celular: "(21) 98765-4321",
    categoria: "Enfermeiro(a)", instituicao: "Hospital Municipal Souza Aguiar", senha: SENHA,
  }, extra);
}
function trabalho(token, extra) {
  return Object.assign({
    token,
    titulo: "Sepse na sala vermelha: tempo até o antibiótico",
    tipo: "Estudo original observacional", eixo: "Emergências clínicas do adulto",
    coautores: [{ nome: "João Souza", cpf: gerarCpf(300000001), email: "Joao.Souza@exemplo.com", instituicao: "CER Barra" }],
    apresentador: "primeiro", apresentadorCpf: "",
    introducao: "Introdução do estudo.", metodos: "Métodos do estudo.",
    resultados: "Resultados com IC 95%.", conclusoes: "Conclusões.",
  }, extra);
}

function criarAmbiente(tipo, opcoes) {
  opcoes = opcoes || {};
  const estado = { agora: new Date(opcoes.agora || "2026-10-07T12:00:00-03:00"), falharEmail: false };
  const agora = function () { return new Date(estado.agora.getTime()); };
  const repo = tipo === "sqlite" ? criarRepoSqlite({ arquivo: ":memory:", agora: agora }) : criarRepoMemoria({ agora: agora });
  const emails = [];
  const banco = regras.criarBanco({
    repo: repo,
    senhas: senhas,
    aleatorio: senhas.aleatorio,
    resumo: senhas.resumo,
    agora: agora,
    email: {
      enviar: async function (m) {
        if (estado.falharEmail) throw new Error("Serviço de e-mail indisponível");
        emails.push(m);
        return "enviado";
      },
    },
    config: Object.assign({ ORGANIZACAO: [ORG] }, opcoes.config),
  });
  const amb = {
    banco: banco, repo: repo, emails: emails, estado: estado,
    enviar: function (acao, dados) { return banco.tratar(acao, dados); },
    passarMinutos: function (n) { estado.agora = new Date(estado.agora.getTime() + n * 60000); },
    ultimoCodigo: function () {
      const m = emails[emails.length - 1].texto.match(/\b(\d{6})\b/);
      return m ? m[1] : "";
    },
    ultimoConvite: function () {
      const m = emails[emails.length - 1].texto.match(/#\/convite\/([0-9a-f]{64})/);
      return m ? m[1] : "";
    },
    inscrever: async function (extra) {
      const r = await banco.tratar("inscricao", inscricao(extra));
      if (!r.ok) throw new Error("inscrição de exemplo recusada: " + r.mensagem);
      return r.token;
    },
    // Organização entra pelo código, como no primeiro acesso de verdade
    entrarOrganizacao: async function () {
      await banco.tratar("pedirCodigo", { email: ORG });
      const r = await banco.tratar("novaSenha", { email: ORG, codigo: amb.ultimoCodigo(), senha: "senha da organização" });
      if (!r.ok) throw new Error("organização não entrou: " + r.mensagem);
      return r.token;
    },
  };
  return amb;
}

async function rodar(tipo, resultados) {
  const ok = function (cond, msg) { resultados.push([!!cond, msg]); };
  const novo = function (opcoes) { return criarAmbiente(tipo, opcoes); };

  // Inscrição e envio de trabalho
  {
    const b = novo();
    let r = await b.enviar("inscricao", inscricao({ email: " Maria@Exemplo.com ", cpf: "52998224725", celular: "21987654321" }));
    ok(r.ok && r.protocolo === "INS-0001" && r.nome === "Maria", "inscrição válida recebe INS-0001");
    ok(/^[0-9a-f]{64}$/.test(r.token) && r.papeis.join() === "inscrito", "a inscrição já abre a sessão, com o perfil de inscrito");
    const tokenMaria = r.token;
    const insc = b.repo.inscricoes.porCpf("52998224725");
    ok(insc.email === "maria@exemplo.com" && insc.celular === "21987654321" && insc.emailConfirmacao === "enviado", "inscrição gravada, com e-mail em minúsculas e confirmação enviada");
    ok(b.emails.length === 1 && b.emails[0].para === "maria@exemplo.com" && b.emails[0].texto.includes("INS-0001") && b.emails[0].texto.includes("#/area"), "e-mail traz o número de inscrição e o caminho da área do inscrito");
    const conta = b.repo.contas.porEmail("maria@exemplo.com");
    ok(conta.cpf === "52998224725" && /^scrypt\$/.test(conta.senha) && conta.verificada === false, "a conta guarda só a senha embaralhada e nasce sem e-mail comprovado");

    r = await b.enviar("inscricao", inscricao({ nome: "Outra Pessoa", email: "outra@exemplo.com" }));
    ok(!r.ok && r.erro === "cpf_duplicado" && r.campo === "cpf" && r.mensagem.includes("INS-0001"), "CPF repetido é recusado e o banco informa o número já existente");
    r = await b.enviar("inscricao", inscricao({ nome: "Outra Pessoa", cpf: CPFS[2], email: " MARIA@exemplo.com" }));
    ok(!r.ok && r.erro === "email_duplicado" && r.campo === "email", "e-mail já usado em outra inscrição é recusado");
    r = await b.enviar("inscricao", inscricao({ nome: "Outra Pessoa", cpf: CPFS[2], email: ORG }));
    ok(!r.ok && r.erro === "email_duplicado", "e-mail da organização não pode ser usado numa inscrição");

    const invalidos = [
      [{ nome: "Maria" }, "nome"], [{ cpf: "123.456.789-00" }, "cpf"], [{ email: "maria@" }, "email"],
      [{ celular: "9876-543" }, "celular"], [{ categoria: "Astronauta" }, "categoria"], [{ instituicao: "  " }, "instituicao"],
      [{ senha: "1234567" }, "senha"], [{ senha: undefined }, "senha"], [{ senha: 12345678 }, "senha"], [{ senha: "x".repeat(101) }, "senha"],
      [{ celular: "(21) 8765-4321" }, "celular"], [{ celular: "(21) 88765-4321" }, "celular"], [{ celular: "(01) 98765-4321" }, "celular"],
    ];
    for (const [extra, campo] of invalidos) {
      const x = await b.enviar("inscricao", inscricao(Object.assign({ cpf: CPFS[3], email: "nova@exemplo.com" }, extra)));
      ok(!x.ok && x.campo === campo, "inscrição com " + campo + " inválido é recusada (" + JSON.stringify(extra).slice(0, 34) + ")");
    }
    ok(b.repo.inscricoes.listar().length === 1 && b.repo.contas.listar().length === 1, "nenhuma inscrição inválida foi gravada");

    // Campo que o formulário não tem mais (a antiga pergunta sobre submeter trabalho) é ignorado
    r = await b.enviar("inscricao", inscricao({ nome: "João Pedro Silva", cpf: CPFS[1], email: "joao@exemplo.com", trabalho: "Sim", senha: "senha do João" }));
    ok(r.ok && r.protocolo === "INS-0002" && !("intencao" in b.repo.inscricoes.porCpf("11144477735")), "inscrição não guarda mais a intenção de submeter trabalho");
    const tokenJoao = r.token;
    ok(b.repo.contas.porEmail("joao@exemplo.com").senha !== b.repo.contas.porEmail("maria@exemplo.com").senha, "cada senha é embaralhada com um sal próprio");

    r = await b.enviar("trabalho", trabalho(""));
    ok(!r.ok && r.erro === "sessao", "trabalho sem sessão é recusado");
    r = await b.enviar("trabalho", trabalho("0".repeat(64)));
    ok(!r.ok && r.erro === "sessao", "trabalho com sessão inventada é recusado");

    r = await b.enviar("trabalho", trabalho(tokenMaria));
    const t = b.repo.trabalhos.porProtocolo("TRB-0001");
    ok(r.ok && r.protocolo === "TRB-0001", "trabalho de inscrita com sessão recebe TRB-0001");
    ok(r.restantes === 2 && r.maximo === 3, "resposta do envio diz quantos trabalhos ainda cabem como primeiro autor");
    ok(t.autorNome === "Maria da Silva" && t.autorCpf === "52998224725" && t.autorEmail === "maria@exemplo.com" && t.apresentadorNome === "Maria da Silva", "primeiro autor, e-mail e apresentador vêm da inscrição da sessão");
    ok(t.coautores.length === 1 && t.coautores[0].email === "joao.souza@exemplo.com" && t.totalAutores === 2 && t.situacao === "Em avaliação", "coautor gravado e trabalho começa em avaliação");
    ok(t.caracteres === "Introduçãodoestudo.Métodosdoestudo.ResultadoscomIC95%.Conclusões.".length && t.emailConfirmacao === "enviado", "caracteres contados sem espaços e confirmação enviada");

    const coautorNaoInscrito = { nome: "Carla Dias", cpf: CPFS[2], email: "carla@exemplo.com" };
    r = await b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Com apresentador", coautores: [coautorNaoInscrito], apresentador: "coautor", apresentadorCpf: CPFS[2] }));
    ok(!r.ok && r.erro === "apresentador_nao_inscrito" && r.campo === "apresentador" && r.mensagem.includes("Carla Dias"), "coautor apresentador sem inscrição é recusado");
    r = await b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Com apresentador", apresentador: "coautor", apresentadorCpf: CPFS[1] }));
    ok(!r.ok && r.campo === "apresentador", "apresentador que não está entre os coautores é recusado");
    r = await b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Com apresentador", coautores: [{ nome: "João Inscrito", cpf: CPFS[1], email: "joao@exemplo.com" }], apresentador: "coautor", apresentadorCpf: CPFS[1] }));
    ok(r.ok && b.repo.trabalhos.porProtocolo("TRB-0002").apresentadorCpf === "11144477735", "coautor inscrito pode apresentar");

    const sete = Array.from({ length: 7 }, (_, i) => coautor(i + 2));
    r = await b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Oito autores", coautores: sete }));
    ok(r.ok && b.repo.trabalhos.porProtocolo("TRB-0003").totalAutores === 8, "oito autores no total são aceitos");
    ok(r.restantes === 0, "depois do terceiro trabalho, a resposta avisa que não cabe mais nenhum");
    r = await b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Nove autores", coautores: sete.concat([coautor(9)]) }));
    ok(!r.ok && r.campo === "coautores", "nove autores são recusados");
    r = await b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Repetido", metodos: "" }));
    ok(!r.ok && r.erro === "resumo_incompleto" && r.campo === "metodos", "resumo com parte vazia é recusado");
    r = await b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Longo", introducao: "a b\n" + "a".repeat(2497), metodos: "x", resultados: "y", conclusoes: "z" }));
    ok(!r.ok && r.erro === "resumo_longo", "resumo acima de 2.500 caracteres é recusado");
    r = await b.enviar("trabalho", trabalho(tokenMaria));
    ok(!r.ok && r.erro === "trabalho_repetido" && r.mensagem.includes("TRB-0001"), "mesmo título do mesmo autor é tratado como reenvio");
    r = await b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Quarto trabalho" }));
    ok(!r.ok && r.erro === "limite_trabalhos", "quarto trabalho como primeiro autor é recusado");
    r = await b.enviar("trabalho", trabalho(tokenJoao, { titulo: "Do João", coautores: [{ nome: "Maria da Silva", cpf: CPFS[0], email: "maria@exemplo.com" }], introducao: "a".repeat(2497), metodos: "b", resultados: "c", conclusoes: "d" }));
    ok(r.ok && r.caracteres === 2500 && b.repo.trabalhos.porProtocolo("TRB-0004").autorCpf === "11144477735", "resumo com exatamente 2.500 caracteres é aceito, em nome de quem está na sessão");

    r = await b.enviar("painel", { token: tokenMaria });
    ok(r.ok && r.inscricao.protocolo === "INS-0001" && r.inscricao.cpf === "529.982.247-25" && r.inscricao.celular === "(21) 98765-4321" && r.inscricao.data === "07/10/2026 12:00", "painel mostra a inscrição de quem entrou");
    ok(r.trabalhos.map((x) => x.protocolo + ":" + x.papel).join(",") === "TRB-0001:Primeiro autor,TRB-0002:Primeiro autor,TRB-0003:Primeiro autor,TRB-0004:Coautor", "painel lista os trabalhos como primeira autora e como coautora");
    ok(r.submissao.aberta && r.submissao.restantes === 0 && r.submissao.prazo === "06/11/2026", "painel informa prazo e trabalhos que ainda pode enviar");
    const enviado = r.trabalhos[0];
    ok(enviado.introducao === "Introdução do estudo." && enviado.conclusoes === "Conclusões." && enviado.caracteres > 0 && enviado.maxCaracteres === 2500, "painel traz o resumo completo do trabalho enviado");
    ok(enviado.autores.length === 2 && enviado.autores[0].nome === "Maria da Silva" && enviado.autores[0].cpf === "529.982.247-25" && enviado.autores[0].instituicao === "Hospital Municipal Souza Aguiar"
      && enviado.autores[1].nome === "João Souza" && enviado.autores[1].email === "joao.souza@exemplo.com" && /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(enviado.autores[1].cpf),
      "quem enviou vê todos os autores, com CPF e e-mail que digitou");
    const comoCoautora = r.trabalhos.filter((x) => x.papel === "Coautor")[0];
    ok(comoCoautora.autores[0].nome === "João Pedro Silva" && !("cpf" in comoCoautora.autores[0]) && !("email" in comoCoautora.autores[0]) && !("cpf" in comoCoautora.autores[1]),
      "coautora vê nomes e instituições, sem CPF nem e-mail dos outros autores");
    ok(!/scrypt|senha/.test(JSON.stringify(r)), "painel não devolve nada da senha");
    ok((await b.enviar("painel", {})).erro === "sessao", "painel sem sessão é recusado");

    r = await b.enviar("conferir", { token: tokenMaria, cpf: CPFS[1], email: "JOAO@exemplo.com" });
    ok(r.ok && r.nome === "João Pedro Silva" && !("cpf" in r), "conferir coautor inscrito devolve nome e instituição");
    ok((await b.enviar("conferir", { token: tokenMaria, cpf: CPFS[1], email: "outro@exemplo.com" })).campo === "email", "conferir com e-mail diferente aponta o e-mail");
    ok((await b.enviar("conferir", { token: tokenMaria, cpf: CPFS[2], email: "x@exemplo.com" })).campo === "cpf", "conferir CPF sem inscrição aponta o CPF");
    ok((await b.enviar("conferir", { cpf: CPFS[1], email: "joao@exemplo.com" })).erro === "sessao", "conferir sem sessão é recusado");

    ok((await b.enviar("outra", {})).erro === "acao_invalida", "ação desconhecida é recusada");
    let internos = true;
    for (const a of ["constructor", "toString", "__proto__", "hasOwnProperty"]) internos = internos && (await b.enviar(a, {})).erro === "acao_invalida";
    ok(internos, "nomes internos do JavaScript não viram ação");
  }

  // Entrar, sessão e senha
  {
    const b = novo();
    await b.inscrever();
    let r = await b.enviar("entrar", { email: " MARIA@exemplo.com", senha: SENHA });
    ok(r.ok && /^[0-9a-f]{64}$/.test(r.token) && r.nome === "Maria" && r.papeis.join() === "inscrito", "entrar com e-mail e senha certos abre a sessão com o perfil");
    const token = r.token;
    r = await b.enviar("entrar", { email: "maria@exemplo.com", senha: SENHA.toUpperCase() });
    ok(!r.ok && r.erro === "credenciais" && r.campo === "senha", "senha errada é recusada");
    const naoExiste = await b.enviar("entrar", { email: "ninguem@exemplo.com", senha: SENHA });
    ok(!naoExiste.ok && naoExiste.mensagem === r.mensagem, "e-mail sem acesso recebe a mesma mensagem da senha errada");
    for (let i = 0; i < 3; i++) await b.enviar("entrar", { email: "maria@exemplo.com", senha: "errada" + i });
    ok((await b.enviar("entrar", { email: "maria@exemplo.com", senha: SENHA })).ok, "senha certa depois de 4 erros ainda entra e zera a contagem");
    for (let i = 0; i < 5; i++) await b.enviar("entrar", { email: "maria@exemplo.com", senha: "errada" + i });
    ok((await b.enviar("entrar", { email: "maria@exemplo.com", senha: SENHA })).erro === "bloqueado", "depois de 5 senhas erradas seguidas, nem a certa entra por 15 minutos");
    b.passarMinutos(16);
    ok((await b.enviar("entrar", { email: "maria@exemplo.com", senha: SENHA })).ok, "16 minutos depois, a senha certa entra de novo");

    r = await b.enviar("sessao", { token });
    ok(r.ok && r.email === "maria@exemplo.com" && r.papeis.join() === "inscrito", "sessao devolve nome, e-mail e perfis");
    b.passarMinutos(5 * 60);
    ok((await b.enviar("painel", { token })).ok, "sessão usada depois de 5 horas continua valendo");
    b.passarMinutos(5 * 60);
    ok((await b.enviar("painel", { token })).ok, "o uso renova a sessão por mais 6 horas");
    b.passarMinutos(6 * 60 + 1);
    ok((await b.enviar("painel", { token })).erro === "sessao", "sessão parada por mais de 6 horas vence");
    const outro = (await b.enviar("entrar", { email: "maria@exemplo.com", senha: SENHA })).token;
    ok((await b.enviar("sair", { token: outro })).ok && (await b.enviar("painel", { token: outro })).erro === "sessao", "sair encerra a sessão");

    // Código por e-mail
    const enviados = b.emails.length;
    r = await b.enviar("pedirCodigo", { email: "ninguem@exemplo.com" });
    const generica = r.mensagem;
    ok(r.ok && b.emails.length === enviados, "pedir código para e-mail sem acesso responde igual e não manda e-mail");
    r = await b.enviar("pedirCodigo", { email: "Maria@Exemplo.com" });
    const codigo = b.ultimoCodigo();
    ok(r.ok && r.mensagem === generica && /^\d{6}$/.test(codigo) && b.emails[b.emails.length - 1].para === "maria@exemplo.com", "pedir código para e-mail inscrito manda um código de 6 números");
    const errado = codigo === "000000" ? "111111" : "000000";
    ok((await b.enviar("novaSenha", { email: "maria@exemplo.com", codigo: errado, senha: "nova senha 123" })).campo === "codigo", "código errado é recusado");
    ok((await b.enviar("novaSenha", { email: "maria@exemplo.com", codigo, senha: "curta" })).campo === "senha", "nova senha curta é recusada");
    r = await b.enviar("novaSenha", { email: "maria@exemplo.com", codigo, senha: "nova senha 123" });
    ok(r.ok && (await b.enviar("painel", { token: r.token })).ok, "código certo troca a senha e já entra");
    ok(b.repo.contas.porEmail("maria@exemplo.com").verificada === true, "o código comprova o e-mail da conta");
    ok(!(await b.enviar("entrar", { email: "maria@exemplo.com", senha: SENHA })).ok && (await b.enviar("entrar", { email: "maria@exemplo.com", senha: "nova senha 123" })).ok, "depois da troca, só a senha nova entra");
    ok((await b.enviar("novaSenha", { email: "maria@exemplo.com", codigo, senha: "outra senha 456" })).erro === "codigo_vencido", "cada código vale uma vez só");
    await b.enviar("pedirCodigo", { email: "maria@exemplo.com" });
    const c2 = b.ultimoCodigo();
    for (let i = 0; i < 5; i++) await b.enviar("novaSenha", { email: "maria@exemplo.com", codigo: c2 === "000000" ? "111111" : "000000", senha: "outra senha 456" });
    ok((await b.enviar("novaSenha", { email: "maria@exemplo.com", codigo: c2, senha: "outra senha 456" })).erro === "codigo_vencido", "depois de 5 tentativas erradas, o código deixa de valer");
    await b.enviar("pedirCodigo", { email: "maria@exemplo.com" });
    ok((await b.enviar("pedirCodigo", { email: "maria@exemplo.com" })).erro === "muitos_codigos", "o quarto pedido de código na mesma hora é recusado");
    const c3 = b.ultimoCodigo();
    b.passarMinutos(31);
    ok((await b.enviar("novaSenha", { email: "maria@exemplo.com", codigo: c3, senha: "outra senha 456" })).erro === "codigo_vencido", "código com mais de 30 minutos não vale");
  }

  // Prazos, vagas e e-mail
  {
    const b = novo({ agora: "2026-11-06T23:30:00-03:00" });
    const token = await b.inscrever();
    ok((await b.enviar("trabalho", trabalho(token))).ok, "06/11 às 23h30 de Brasília ainda aceita trabalho");
    b.estado.agora = new Date("2026-11-07T00:30:00-03:00");
    ok((await b.enviar("trabalho", trabalho(token, { titulo: "Atrasado" }))).erro === "fora_do_prazo", "07/11 às 00h30 de Brasília recusa trabalho");
    ok((await b.enviar("painel", { token })).submissao.aberta === false, "depois do prazo, o painel avisa que a submissão fechou");
    b.estado.agora = new Date("2026-10-05T23:30:00-03:00");
    ok((await b.enviar("inscricao", inscricao({ cpf: CPFS[1], email: "joao@exemplo.com" }))).erro === "fora_do_prazo", "inscrição em 05/10 às 23h30 é recusada");
    b.estado.agora = new Date("2026-12-01T00:10:00-03:00");
    ok((await b.enviar("inscricao", inscricao({ cpf: CPFS[3], email: "d@exemplo.com" }))).erro === "fora_do_prazo", "inscrição em 01/12 às 00h10 é recusada");

    const v = novo({ config: { VAGAS: 2 } });
    await v.inscrever();
    await v.inscrever({ cpf: CPFS[1], email: "a@exemplo.com" });
    ok((await v.enviar("inscricao", inscricao({ cpf: CPFS[2], email: "b@exemplo.com" }))).erro === "vagas_esgotadas", "com VAGAS = 2, a terceira inscrição é recusada");

    const e = novo();
    e.estado.falharEmail = true;
    const r = await e.enviar("inscricao", inscricao());
    ok(r.ok && e.repo.inscricoes.porCpf("52998224725").emailConfirmacao.startsWith("não enviado"), "falha no e-mail não impede a inscrição e fica registrada");

    const t = novo({ config: { TESTE: true } });
    await t.inscrever();
    ok(t.emails[0].assunto.startsWith("[TESTE]") && t.emails[0].texto.startsWith("Este e-mail veio do ambiente de teste"), "no modo de teste, o e-mail sai com [TESTE]");
  }

  // Organização, convite da comissão e avaliação
  {
    const b = novo();
    const tokenMaria = await b.inscrever();
    await b.enviar("trabalho", trabalho(tokenMaria));
    await b.enviar("trabalho", trabalho(tokenMaria, { titulo: "Segundo trabalho" }));

    ok(!(await b.enviar("entrar", { email: ORG, senha: "qualquer coisa" })).ok, "organização sem senha ainda não entra");
    ok((await b.enviar("orgPainel", { token: tokenMaria })).erro === "sem_acesso", "inscrita não abre a área da organização");
    const tokenOrg = await b.entrarOrganizacao();
    let r = await b.enviar("sessao", { token: tokenOrg });
    ok(r.papeis.join() === "organizacao", "organização cria a senha pelo código e entra com o perfil de organização");
    r = await b.enviar("orgPainel", { token: tokenOrg });
    ok(r.ok && r.inscricoes.length === 1 && r.inscricoes[0].cpf === "529.982.247-25" && r.trabalhos.length === 2 && r.comissao.length === 0, "a organização vê inscrições, trabalhos e a comissão");

    ok((await b.enviar("orgConvidar", { token: tokenOrg, nome: "Ana", email: "ana@exemplo.com" })).campo === "nome", "convite pede nome completo");
    ok((await b.enviar("orgConvidar", { token: tokenMaria, nome: "Ana Avaliadora", email: "ana@exemplo.com" })).erro === "sem_acesso", "inscrita não convida ninguém");
    r = await b.enviar("orgConvidar", { token: tokenOrg, nome: "Ana Avaliadora", email: "ANA@exemplo.com" });
    const convite = b.ultimoConvite();
    ok(r.ok && r.membro.situacao.startsWith("Convite enviado") && /^[0-9a-f]{64}$/.test(convite) && b.emails[b.emails.length - 1].para === "ana@exemplo.com", "a organização convida a avaliadora e o link de convite vai por e-mail");
    ok((await b.enviar("orgConvidar", { token: tokenOrg, nome: "Ana Avaliadora", email: "ana@exemplo.com" })).erro === "ja_na_comissao", "o mesmo e-mail não entra duas vezes na comissão");
    ok(!(await b.enviar("entrar", { email: "ana@exemplo.com", senha: "qualquer1" })).ok, "convidada ainda não entra antes de aceitar o convite");
    ok((await b.enviar("inscricao", inscricao({ nome: "Ana Avaliadora", cpf: CPFS[2], email: "ana@exemplo.com" }))).erro === "email_duplicado", "ninguém usa o e-mail de uma convidada para se inscrever e tomar o acesso");

    r = await b.enviar("convite", { convite });
    ok(r.ok && r.nome === "Ana Avaliadora" && r.email === "ana@exemplo.com", "o link do convite mostra nome e e-mail");
    ok(!(await b.enviar("convite", { convite: "f".repeat(64) })).ok, "convite inventado não vale");
    ok((await b.enviar("aceitarConvite", { convite, senha: "curta" })).campo === "senha", "senha curta no convite é recusada");
    r = await b.enviar("aceitarConvite", { convite, senha: "senha da Ana 1" });
    ok(r.ok && r.papeis.join() === "comissao" && r.nome === "Ana", "aceitar o convite cria a senha e entra com o perfil de comissão");
    const tokenAna = r.token;
    ok(!(await b.enviar("convite", { convite })).ok, "o convite vale uma vez só");
    ok((await b.enviar("entrar", { email: "ana@exemplo.com", senha: "senha da Ana 1" })).papeis.join() === "comissao", "a avaliadora entra pelo mesmo Entrar de todos");
    ok((await b.enviar("orgPainel", { token: tokenOrg })).comissao[0].situacao === "Ativo", "na organização, a avaliadora aparece como ativa");
    ok((await b.enviar("painel", { token: tokenAna })).erro === "sem_acesso" && (await b.enviar("comissaoTrabalhos", { token: tokenMaria })).erro === "sem_acesso", "inscrita não avalia e avaliadora não tem painel de inscrito");
    ok((await b.enviar("orgPainel", { token: tokenAna })).erro === "sem_acesso", "avaliadora não abre a área da organização");

    r = await b.enviar("comissaoTrabalhos", { token: tokenAna });
    ok(r.ok && r.trabalhos.length === 2 && r.trabalhos[0].primeiroAutor === "Maria da Silva" && r.trabalhos[0].coautores.includes("João Souza") && r.trabalhos[0].situacao === "Em avaliação", "comissão vê os trabalhos com autores, resumo e situação");

    const antes = b.emails.length;
    r = await b.enviar("comissaoDecidir", { token: tokenAna, protocolo: "TRB-0001", decisao: "aceito", comentario: "Parabéns pelo estudo." });
    const t1 = b.repo.trabalhos.porProtocolo("TRB-0001");
    ok(r.ok && t1.situacao === "Aceito" && t1.avaliadorNome === "Ana Avaliadora" && t1.avaliadorEmail === "ana@exemplo.com" && t1.comentario === "Parabéns pelo estudo." && t1.emailResultado === "enviado", "aceitar grava decisão, avaliadora, comentário e envio do e-mail");
    const m = b.emails[b.emails.length - 1];
    ok(b.emails.length === antes + 1 && m.para === "maria@exemplo.com" && m.assunto.includes("TRB-0001") && m.texto.includes("foi aceito") && m.texto.includes("Parabéns pelo estudo."), "o primeiro autor recebe na hora o e-mail de aceite com o comentário");
    r = await b.enviar("comissaoDecidir", { token: tokenAna, protocolo: "TRB-0001", decisao: "recusado" });
    ok(!r.ok && r.erro === "ja_avaliado" && b.emails.length === antes + 1, "trabalho já avaliado não recebe segunda decisão nem segundo e-mail");
    r = await b.enviar("comissaoDecidir", { token: tokenAna, protocolo: "TRB-0002", decisao: "recusado" });
    ok(r.ok && b.emails[b.emails.length - 1].texto.includes("não foi aceito"), "recusar manda o e-mail de recusa");
    ok((await b.enviar("comissaoDecidir", { token: tokenAna, protocolo: "TRB-0002", decisao: "talvez" })).erro === "decisao", "decisão fora de aceitar ou recusar é recusada");
    ok(!(await b.enviar("comissaoDecidir", { token: tokenAna, protocolo: "TRB-9999", decisao: "aceito" })).ok, "protocolo inexistente é recusado");
    const p = await b.enviar("painel", { token: tokenMaria });
    ok(p.trabalhos[0].situacao === "Aceito" && p.trabalhos[0].comentario === "Parabéns pelo estudo." && p.trabalhos[1].situacao === "Recusado", "a área do inscrito mostra aceito ou recusado e o comentário");

    r = await b.enviar("orgReenviarConvite", { token: tokenOrg, email: "ana@exemplo.com" });
    ok(r.ok && b.ultimoConvite(), "a organização reenvia o convite");
    r = await b.enviar("orgRemoverComissao", { token: tokenOrg, email: "ana@exemplo.com" });
    ok(r.ok && (await b.enviar("comissaoTrabalhos", { token: tokenAna })).erro === "sessao", "avaliadora tirada da comissão perde o acesso na hora");
    ok((await b.enviar("orgPainel", { token: tokenOrg })).comissao.length === 0, "a comissão fica vazia depois da remoção");
    ok(!(await b.enviar("aceitarConvite", { convite: b.ultimoConvite(), senha: "mais uma senha" })).ok, "convite de quem saiu da comissão não vale mais");

    // Inscrita convidada para a comissão: precisa aceitar o convite para avaliar
    await b.enviar("orgConvidar", { token: tokenOrg, nome: "Maria da Silva", email: "maria@exemplo.com" });
    ok((await b.enviar("entrar", { email: "maria@exemplo.com", senha: SENHA })).papeis.join() === "inscrito", "inscrita convidada continua só inscrita até aceitar o convite");
    const r2 = await b.enviar("aceitarConvite", { convite: b.ultimoConvite(), senha: "senha nova da Maria" });
    ok(r2.ok && r2.papeis.join() === "comissao,inscrito", "depois do convite, a mesma conta tem os dois perfis");
    ok((await b.enviar("orgRemoverComissao", { token: tokenOrg, email: "maria@exemplo.com" })).ok && (await b.enviar("entrar", { email: "maria@exemplo.com", senha: "senha nova da Maria" })).papeis.join() === "inscrito", "tirar da comissão mantém a inscrição");
  }

}

(async function () {
  let total = 0;
  let falhas = 0;
  for (const tipo of ["memória", "sqlite"]) {
    const resultados = [];
    try {
      await rodar(tipo === "memória" ? "memoria" : "sqlite", resultados);
    } catch (erro) {
      resultados.push([false, "o teste parou no meio com erro: " + (erro && erro.stack ? erro.stack.split("\n").slice(0, 2).join(" ") : erro)]);
    }
    console.log("\n== Repositório em " + tipo + " ==");
    resultados.forEach(([passou, msg]) => console.log((passou ? "ok    " : "FALHA ") + msg));
    total += resultados.length;
    falhas += resultados.filter((r) => !r[0]).length;
  }

  // O banco de teste do navegador precisa estar em dia com as regras
  const { gerar, DESTINO } = require("../navegador/gerar.js");
  const emDia = fs.existsSync(DESTINO) && fs.readFileSync(DESTINO, "utf8") === gerar();
  console.log("\n" + (emDia ? "ok    " : "FALHA ") + path.relative(process.cwd(), DESTINO) + " está em dia (se falhar, rode: node servidor/navegador/gerar.js)");
  total++;
  if (!emDia) falhas++;

  console.log("\n" + (total - falhas) + " de " + total + " verificações passaram.");
  if (falhas) process.exitCode = 1;
})();
