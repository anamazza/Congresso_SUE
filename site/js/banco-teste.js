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

  /* =====================================================================
   1º Simpósio de Urgência e Emergência · regras do sistema
   ---------------------------------------------------------------------
   Núcleo único das regras do edital e dos acessos: inscrição, senha,
   sessão, envio de trabalho, avaliação da comissão e área da organização.

   Roda no servidor (servidor.js, com banco SQLite) e no navegador, no
   modo de teste do site (site/js/banco-teste.js, gerado a partir deste
   arquivo). Nada aqui depende do ambiente: o banco de dados, as senhas,
   o e-mail, o relógio e os números aleatórios chegam em "deps".

   O site chama  tratar(acao, dados)  e recebe um objeto com ok: true ou
   ok: false, mensagem e, às vezes, o campo do formulário a destacar.
   ===================================================================== */
(function (raiz) {
  "use strict";

  const CONFIG_PADRAO = {
    EVENTO: "1º Simpósio de Urgência e Emergência",
    DATAS: "3 e 4 de dezembro de 2026",
    LOCAL: "UNIGRANRIO, Campus Barra da Tijuca, Rio de Janeiro",
    SITE: "https://diid.subhue.org/static-html/congresso-sue/", // endereço usado nos links dos e-mails
    FUSO: "America/Sao_Paulo",

    // Inscrições. Datas no formato AAAA-MM-DD; vazio = sem data.
    INSCRICOES_INICIO: "2026-10-06",
    INSCRICOES_FIM: "2026-11-30", // último dia, até 23h59 de Brasília
    VAGAS: 0, // número máximo de inscrições; 0 = sem limite automático

    // Trabalhos
    SUBMISSAO_INICIO: "2026-09-25",
    SUBMISSAO_FIM: "2026-11-06", // último dia de envio, até 23h59 de Brasília
    RESULTADO: "16/11/2026",
    MAX_TRABALHOS_PRIMEIRO_AUTOR: 3,
    MAX_AUTORES: 8,
    MAX_CARACTERES: 2500, // resumo, sem contar os espaços
    MAX_TITULO: 200,      // título, contando os espaços

    // Acessos
    SENHA_MINIMA: 8,
    SESSAO_HORAS: 6,   // tempo sem uso até pedir a senha de novo
    CONVITE_DIAS: 7,   // validade do link de convite da comissão
    ORGANIZACAO: [],   // e-mails com acesso à área da organização

    // true no ambiente de teste: os e-mails saem com [TESTE] no assunto
    TESTE: false,
  };

  const CATEGORIAS = [
    "Médico(a)", "Enfermeiro(a)", "Técnico(a) ou auxiliar de enfermagem", "Fisioterapeuta",
    "Farmacêutico(a)", "Psicólogo(a)", "Assistente social", "Outra categoria da saúde",
    "Gestor(a) de serviço de saúde", "Residente", "Estudante", "Outra área",
  ];
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

  const MAX_FALHAS_ENTRADA = 5;    // senhas erradas seguidas antes de esperar 15 minutos
  const MAX_CODIGOS_POR_HORA = 3;  // códigos de senha por e-mail
  const MAX_TENTATIVAS_CODIGO = 5; // tentativas para acertar cada código
  const DECISOES = { aceito: "Aceito", recusado: "Recusado" };
  const EM_AVALIACAO = "Em avaliação";

  /* ---------------------------------------------------------------------
     deps = {
       repo,                         banco de dados (repo-sqlite.js ou repo-memoria.js)
       senhas: { proteger, confere } versão embaralhada da senha e conferência
       email: { enviar(msg) }        devolve uma promessa com "enviado" ou o motivo da falha
       agora: () => Date             relógio
       aleatorio: (bytes) => "hex"   números aleatórios seguros, em hexadecimal
       resumo: (texto) => "hex"      SHA-256, para guardar sessões e códigos sem o valor original
       config                        sobrepõe CONFIG_PADRAO
       log                           registro de erros (opcional)
     }
     --------------------------------------------------------------------- */
  function criarBanco(deps) {
    const repo = deps.repo;
    const cfg = Object.assign({}, CONFIG_PADRAO, deps.config || {});
    cfg.ORGANIZACAO = (cfg.ORGANIZACAO || []).map(function (e) { return String(e).trim().toLowerCase(); }).filter(Boolean);
    const agora = deps.agora || function () { return new Date(); };
    const log = deps.log || function () {};

    const ACOES = {
      // Público
      inscricao: inscricao,
      entrar: entrar,
      pedirCodigo: pedirCodigo,
      novaSenha: novaSenha,
      convite: verConvite,
      aceitarConvite: aceitarConvite,
      // Com sessão
      sessao: sessao,
      sair: sair,
      painel: painel,
      trabalho: trabalho,
      conferir: conferir,
      // Comissão
      comissaoTrabalhos: comissaoTrabalhos,
      comissaoDecidir: comissaoDecidir,
      // Organização
      orgPainel: orgPainel,
      orgConvidar: orgConvidar,
      orgReenviarConvite: orgReenviarConvite,
      orgRemoverComissao: orgRemoverComissao,
    };

    async function tratar(acao, dados) {
      if (typeof acao !== "string" || !Object.prototype.hasOwnProperty.call(ACOES, acao)) {
        return falha("acao_invalida", "Tipo de envio desconhecido.");
      }
      const d = dados && typeof dados === "object" && !Array.isArray(dados) ? dados : {};
      try {
        return await ACOES[acao](d);
      } catch (erro) {
        log(erro);
        return falha("erro_interno", "Não foi possível concluir agora. Tente de novo em alguns minutos.");
      }
    }

    /* -------------------------------------------------------------------
       Inscrição: grava a inscrição, cria o acesso e já abre a sessão
       ------------------------------------------------------------------- */
    async function inscricao(d) {
      if (!dentroDoPeriodo(cfg.INSCRICOES_INICIO, cfg.INSCRICOES_FIM)) {
        return falha("fora_do_prazo", "As inscrições não estão abertas neste momento.");
      }
      const nome = texto(d.nome, 120);
      if (nome.split(" ").length < 2) return falha("nome", "Informe o nome completo.", "nome");
      const cpf = soDigitos(d.cpf);
      if (!cpfValido(cpf)) return falha("cpf", "Confira o CPF.", "cpf");
      const email = texto(d.email, 120).toLowerCase();
      if (!emailValido(email)) return falha("email", "Confira o e-mail.", "email");
      const celular = soDigitos(d.celular);
      if (!/^[1-9]{2}9\d{8}$/.test(celular)) {
        return falha("celular", "Informe o celular com DDD e o 9 inicial, por exemplo (21) 99999-9999.", "celular");
      }
      const categoria = texto(d.categoria, 60);
      if (CATEGORIAS.indexOf(categoria) < 0) return falha("categoria", "Escolha a categoria profissional.", "categoria");
      const instituicao = texto(d.instituicao, 120);
      if (!instituicao) return falha("instituicao", "Informe a instituição ou unidade.", "instituicao");
      const senha = senhaRecebida(d.senha);
      const erroSenha = conferirSenha(senha);
      if (erroSenha) return falha("senha", erroSenha, "senha");
      const protegida = deps.senhas.proteger(senha);

      const r = repo.atomico(function () {
        const existente = repo.inscricoes.porCpf(cpf);
        if (existente) {
          return falha(
            "cpf_duplicado",
            "Este CPF já está inscrito no simpósio, com o número " + existente.protocolo + ". Para corrigir algum dado, fale com a organização.",
            "cpf"
          );
        }
        // O e-mail é o login: um por inscrição, e nunca o de quem já tem outro acesso
        const conta = repo.contas.porEmail(email);
        if (repo.inscricoes.porEmail(email) || (conta && (conta.comissao || conta.senha)) || cfg.ORGANIZACAO.indexOf(email) >= 0) {
          return falha(
            "email_duplicado",
            "Este e-mail já está em uso no site. Cada inscrição precisa de um e-mail próprio, que também é o login da área do inscrito.",
            "email"
          );
        }
        const inscricoes = repo.inscricoes.listar();
        if (cfg.VAGAS > 0 && inscricoes.length >= cfg.VAGAS) return falha("vagas_esgotadas", "As vagas do simpósio se esgotaram.");

        const protocolo = proximoProtocolo("INS", inscricoes);
        const momento = agora().toISOString();
        repo.inscricoes.inserir({
          protocolo: protocolo, criadoEm: momento, nome: nome, cpf: cpf, email: email,
          celular: celular, categoria: categoria, instituicao: instituicao, emailConfirmacao: "",
        });
        // A senha da inscrição não prova que o e-mail é da pessoa: a conta nasce sem verificação
        repo.contas.salvar({
          email: email, nome: nome, cpf: cpf, senha: protegida, verificada: false,
          comissao: false, criadaEm: momento, atualizadaEm: momento, convidadoEm: "",
        });
        return { ok: true, protocolo: protocolo };
      });
      if (!r.ok) return r;

      const primeiroNome = nome.split(" ")[0];
      const situacao = await enviarEmail(email, "Inscrição recebida · " + cfg.EVENTO, [
        "Olá, " + primeiroNome + ".",
        "Recebemos a sua inscrição no " + cfg.EVENTO + ", nos dias " + cfg.DATAS + ", na " + cfg.LOCAL + ".",
        "Número de inscrição: " + r.protocolo,
        "As vagas são limitadas e preenchidas por ordem de inscrição. A organização vai enviar as orientações sobre a confirmação da sua participação.",
        "Para ver a sua inscrição e enviar trabalhos, entre na área do inscrito com este e-mail e a senha que você criou: " + cfg.SITE + "#/area",
      ]);
      repo.inscricoes.atualizar(r.protocolo, { emailConfirmacao: situacao });
      return Object.assign({ ok: true, protocolo: r.protocolo, nome: primeiroNome }, abrirSessao(email));
    }

    /* -------------------------------------------------------------------
       Entrada, sessão e senha (para todos os perfis)
       ------------------------------------------------------------------- */
    async function entrar(d) {
      const email = texto(d.email, 120).toLowerCase();
      if (!emailValido(email)) return falha("email", "Confira o e-mail.", "email");
      const senha = senhaRecebida(d.senha);
      if (!senha) return falha("senha", "Informe a senha.", "senha");

      const chaveFalhas = "falhas:" + deps.resumo(email);
      const falhas = Number(repo.cache.get(chaveFalhas) || 0);
      if (falhas >= MAX_FALHAS_ENTRADA) {
        return falha("bloqueado", "Muitas tentativas erradas com este e-mail. Aguarde 15 minutos ou crie uma nova senha em \"Esqueci a senha\".");
      }
      const conta = repo.contas.porEmail(email);
      if (!conta || !conta.senha || !deps.senhas.confere(senha, conta.senha) || !papeisDe(conta).length) {
        repo.cache.put(chaveFalhas, String(falhas + 1), 15 * 60);
        return falha(
          "credenciais",
          "E-mail ou senha incorretos. Se esqueceu a senha, ou se é o seu primeiro acesso, use \"Esqueci a senha\".",
          "senha"
        );
      }
      repo.cache.remove(chaveFalhas);
      return Object.assign({ ok: true }, abrirSessao(email));
    }

    // Manda um código de 6 números para criar ou trocar a senha. A resposta é a
    // mesma para qualquer e-mail, para não revelar quem tem acesso ao site.
    async function pedirCodigo(d) {
      const email = texto(d.email, 120).toLowerCase();
      if (!emailValido(email)) return falha("email", "Confira o e-mail.", "email");
      const chaveEnvios = "envios:" + deps.resumo(email);
      const envios = Number(repo.cache.get(chaveEnvios) || 0);
      if (envios >= MAX_CODIGOS_POR_HORA) {
        return falha("muitos_codigos", "Já enviamos " + MAX_CODIGOS_POR_HORA + " códigos para este e-mail há pouco. Use o código mais recente ou aguarde uma hora.");
      }
      repo.cache.put(chaveEnvios, String(envios + 1), 3600);

      if (podeTerAcesso(email)) {
        const codigo = String(parseInt(deps.aleatorio(6), 16) % 1000000).padStart(6, "0");
        repo.cache.put("codigo:" + deps.resumo(email), JSON.stringify({ h: deps.resumo(codigo + ":" + email), n: 0 }), 30 * 60);
        await enviarEmail(email, "Código para a sua senha · " + cfg.EVENTO, [
          "Olá" + saudacao(email) + ".",
          "Use este código para criar ou trocar a sua senha de acesso ao site do simpósio: " + codigo,
          "O código vale por 30 minutos. Se você não pediu, ignore este e-mail: a sua senha continua a mesma.",
        ]);
      }
      return { ok: true, mensagem: "Se este e-mail tiver acesso ao site, enviamos um código de 6 números. Ele vale por 30 minutos." };
    }

    async function novaSenha(d) {
      const email = texto(d.email, 120).toLowerCase();
      if (!emailValido(email)) return falha("email", "Confira o e-mail.", "email");
      const codigo = soDigitos(d.codigo);
      if (codigo.length !== 6) return falha("codigo", "O código tem 6 números.", "codigo");
      const senha = senhaRecebida(d.senha);
      const erroSenha = conferirSenha(senha);
      if (erroSenha) return falha("senha", erroSenha, "senha");

      const chave = "codigo:" + deps.resumo(email);
      let guardado = null;
      try {
        guardado = JSON.parse(repo.cache.get(chave) || "null");
      } catch (erro) {
        guardado = null;
      }
      if (!guardado || guardado.n >= MAX_TENTATIVAS_CODIGO || !podeTerAcesso(email)) {
        repo.cache.remove(chave);
        return falha("codigo_vencido", "Código vencido ou inválido. Peça um novo código.", "codigo");
      }
      if (guardado.h !== deps.resumo(codigo + ":" + email)) {
        guardado.n++;
        repo.cache.put(chave, JSON.stringify(guardado), 30 * 60);
        return falha("codigo", "Código incorreto. Confira os 6 números do e-mail mais recente.", "codigo");
      }
      repo.cache.remove(chave);
      gravarSenha(email, senha);
      repo.cache.remove("falhas:" + deps.resumo(email));
      return Object.assign({ ok: true }, abrirSessao(email));
    }

    async function sessao(d) {
      const s = sessaoDe(d.token);
      if (!s) return semSessao();
      return Object.assign({ ok: true }, descricaoDaConta(s.conta));
    }

    async function sair(d) {
      if (typeof d.token === "string" && d.token) repo.cache.remove("sessao:" + deps.resumo(d.token));
      return { ok: true };
    }

    /* -------------------------------------------------------------------
       Área do inscrito: painel, envio de trabalho e coautores
       ------------------------------------------------------------------- */
    async function painel(d) {
      const s = sessaoDe(d.token, "inscrito");
      if (!s) return s === null ? semSessao() : semPerfil("inscrito");
      const insc = s.inscricao;
      const cpf = insc.cpf;
      const trabalhos = repo.trabalhos.listar()
        .filter(function (t) {
          return t.autorCpf === cpf || t.coautores.some(function (c) { return c.cpf === cpf; });
        })
        .map(function (t) {
          const enviou = t.autorCpf === cpf;
          return {
            protocolo: t.protocolo, data: dataHora(t.criadoEm), titulo: t.titulo, tipo: t.tipo, eixo: t.eixo,
            apresentador: t.apresentadorNome, papel: enviou ? "Primeiro autor" : "Coautor",
            situacao: t.situacao, comentario: t.situacao === EM_AVALIACAO ? "" : t.comentario || "",
            autores: autoresDoTrabalho(t, enviou),
            introducao: t.introducao, metodos: t.metodos, resultados: t.resultados, conclusoes: t.conclusoes,
            caracteres: t.caracteres, maxCaracteres: cfg.MAX_CARACTERES,
          };
        });
      const comoPrimeiro = trabalhos.filter(function (t) { return t.papel === "Primeiro autor"; }).length;
      return {
        ok: true,
        inscricao: {
          protocolo: insc.protocolo, data: dataHora(insc.criadoEm), nome: insc.nome, cpf: formatarCpf(cpf),
          email: insc.email, celular: formatarCelular(insc.celular), categoria: insc.categoria, instituicao: insc.instituicao,
        },
        trabalhos: trabalhos,
        submissao: {
          aberta: dentroDoPeriodo(cfg.SUBMISSAO_INICIO, cfg.SUBMISSAO_FIM),
          prazo: cfg.SUBMISSAO_FIM.split("-").reverse().join("/"),
          maximo: cfg.MAX_TRABALHOS_PRIMEIRO_AUTOR,
          restantes: Math.max(0, cfg.MAX_TRABALHOS_PRIMEIRO_AUTOR - comoPrimeiro),
        },
        papeis: papeisDe(s.conta),
      };
    }

    // Autores na ordem do trabalho. Quem enviou (o primeiro autor) vê o CPF e o
    // e-mail que digitou de cada um, para conferir; um coautor vê só nomes e
    // instituições, sem os dados pessoais dos outros autores.
    function autoresDoTrabalho(t, completo) {
      const inscAutor = repo.inscricoes.porCpf(t.autorCpf);
      const lista = [{ nome: t.autorNome, cpf: t.autorCpf, email: t.autorEmail, instituicao: inscAutor ? inscAutor.instituicao : "" }]
        .concat(t.coautores);
      return lista.map(function (a) {
        const autor = { nome: a.nome, instituicao: a.instituicao || "" };
        if (completo) {
          autor.cpf = formatarCpf(a.cpf);
          autor.email = a.email;
        }
        return autor;
      });
    }

    async function trabalho(d) {
      const hojeBr = hoje();
      if (cfg.SUBMISSAO_INICIO && hojeBr < cfg.SUBMISSAO_INICIO) return falha("fora_do_prazo", "O envio de trabalhos ainda não começou.");
      if (cfg.SUBMISSAO_FIM && hojeBr > cfg.SUBMISSAO_FIM) return falha("fora_do_prazo", "O prazo de envio de trabalhos está encerrado.");

      // Quem envia é o primeiro autor, que entrou na área do inscrito
      const s = sessaoDe(d.token, "inscrito");
      if (!s) return s === null ? semSessao() : semPerfil("inscrito");
      const insc = s.inscricao;
      const cpf = insc.cpf;

      const titulo = texto(d.titulo, 1000);
      if (!titulo) return falha("titulo", "Informe o título do trabalho.", "titulo");
      if (titulo.length > cfg.MAX_TITULO) {
        return falha("titulo", "O título pode ter até " + cfg.MAX_TITULO + " caracteres, contando os espaços.", "titulo");
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
      if (coautores.length + 1 > cfg.MAX_AUTORES) {
        return falha("coautores", "Cada trabalho pode ter até " + cfg.MAX_AUTORES + " autores, somando autores e coautores.", "coautores");
      }
      if (coautores.some(function (c) { return c.nome.split(" ").length < 2 || !cpfValido(c.cpf) || !emailValido(c.email); })) {
        return falha("coautores", "Informe nome completo, CPF válido e e-mail de cada coautor.", "coautores");
      }
      const cpfsAutores = [cpf].concat(coautores.map(function (c) { return c.cpf; }));
      if (cpfsAutores.some(function (c, i) { return cpfsAutores.indexOf(c) !== i; })) {
        return falha("coautores", "O mesmo CPF aparece em mais de um autor.", "coautores");
      }

      let apresentadorNome = insc.nome;
      let apresentadorCpf = cpf;
      if (d.apresentador === "coautor") {
        const cpfA = soDigitos(d.apresentadorCpf);
        const coautorA = coautores.filter(function (c) { return c.cpf === cpfA; })[0];
        if (!coautorA) return falha("apresentador", "Escolha como apresentador um dos coautores informados.", "apresentador");
        const inscA = repo.inscricoes.porCpf(cpfA);
        if (!inscA) {
          return falha(
            "apresentador_nao_inscrito",
            coautorA.nome + " precisa estar inscrito(a) no simpósio para apresentar. Não encontramos inscrição com o CPF informado.",
            "apresentador"
          );
        }
        apresentadorNome = inscA.nome;
        apresentadorCpf = cpfA;
      }

      const partes = PARTES_RESUMO.map(function (chave) { return textoLongo(d[chave], 4000); });
      const vazia = PARTES_RESUMO.filter(function (_c, i) { return !partes[i]; })[0];
      if (vazia) return falha("resumo_incompleto", "Preencha as quatro partes do resumo.", vazia);
      const caracteres = partes.join("").replace(/\s/g, "").length;
      if (caracteres > cfg.MAX_CARACTERES) {
        return falha("resumo_longo", "O resumo tem " + caracteres + " caracteres sem espaços. O limite é " + cfg.MAX_CARACTERES + ".", "resumo");
      }

      const r = repo.atomico(function () {
        const todos = repo.trabalhos.listar();
        const doAutor = todos.filter(function (t) { return t.autorCpf === cpf; });
        const repetido = doAutor.filter(function (t) { return t.titulo.trim().toLowerCase() === titulo.toLowerCase(); })[0];
        if (repetido) return falha("trabalho_repetido", "Este trabalho já foi enviado, com o protocolo " + repetido.protocolo + ".");
        if (doAutor.length >= cfg.MAX_TRABALHOS_PRIMEIRO_AUTOR) {
          return falha("limite_trabalhos", "Você já enviou " + doAutor.length + " trabalhos como primeiro autor, o máximo permitido pelo edital.");
        }
        const protocolo = proximoProtocolo("TRB", todos);
        repo.trabalhos.inserir({
          protocolo: protocolo, criadoEm: agora().toISOString(), titulo: titulo, tipo: tipo, eixo: eixo,
          autorNome: insc.nome, autorCpf: cpf, autorEmail: insc.email, coautores: coautores, totalAutores: coautores.length + 1,
          apresentadorNome: apresentadorNome, apresentadorCpf: apresentadorCpf,
          introducao: partes[0], metodos: partes[1], resultados: partes[2], conclusoes: partes[3], caracteres: caracteres,
          emailConfirmacao: "", situacao: EM_AVALIACAO, avaliadorNome: "", avaliadorEmail: "", avaliadoEm: "", comentario: "", emailResultado: "",
        });
        return { ok: true, protocolo: protocolo, restantes: Math.max(0, cfg.MAX_TRABALHOS_PRIMEIRO_AUTOR - doAutor.length - 1) };
      });
      if (!r.ok) return r;

      const situacao = await enviarEmail(insc.email, "Trabalho recebido · " + r.protocolo + " · " + cfg.EVENTO, [
        "Olá, " + insc.nome.split(" ")[0] + ".",
        "Recebemos o trabalho \"" + titulo + "\" para o " + cfg.EVENTO + ".",
        "Protocolo: " + r.protocolo,
        "Tipo: " + tipo + ". Eixo temático: " + eixo + ". Apresentador: " + apresentadorNome + ".",
        "O resumo tem " + caracteres + " caracteres sem espaços.",
        "O resultado chega por e-mail assim que a Comissão Científica avaliar o trabalho, até " + cfg.RESULTADO + ". Ele também aparece na área do inscrito.",
      ]);
      repo.trabalhos.atualizar(r.protocolo, { emailConfirmacao: situacao });
      // "restantes": quantos trabalhos a pessoa ainda pode enviar como primeiro autor
      return {
        ok: true, protocolo: r.protocolo, titulo: titulo, caracteres: caracteres, apresentador: apresentadorNome,
        restantes: r.restantes, maximo: cfg.MAX_TRABALHOS_PRIMEIRO_AUTOR,
      };
    }

    // Preenche coautores inscritos: só para quem entrou, e só quando CPF e
    // e-mail do coautor são da mesma inscrição. O CPF sozinho não revela nada.
    async function conferir(d) {
      const s = sessaoDe(d.token, "inscrito");
      if (!s) return s === null ? semSessao() : semPerfil("inscrito");
      const cpf = soDigitos(d.cpf);
      if (!cpfValido(cpf)) return falha("cpf", "Confira o CPF.", "cpf");
      const email = texto(d.email, 120).toLowerCase();
      if (!emailValido(email)) return falha("email", "Confira o e-mail.", "email");
      const insc = repo.inscricoes.porCpf(cpf);
      if (!insc) {
        return falha("nao_inscrito", "Não encontramos inscrição com este CPF. Confira os números ou faça a sua inscrição antes de enviar o trabalho.", "cpf");
      }
      if (insc.email !== email) {
        return falha("email_diferente", "Este e-mail não é o da inscrição deste CPF. Use o mesmo e-mail da inscrição, o endereço que recebeu a confirmação com o número de inscrição.", "email");
      }
      return { ok: true, nome: insc.nome, instituicao: insc.instituicao };
    }

    /* -------------------------------------------------------------------
       Comissão: avaliação dos trabalhos
       ------------------------------------------------------------------- */
    function trabalhoCompleto(t) {
      return {
        protocolo: t.protocolo, data: dataHora(t.criadoEm), titulo: t.titulo, tipo: t.tipo, eixo: t.eixo,
        primeiroAutor: t.autorNome, autorEmail: t.autorEmail,
        coautores: t.coautores.map(function (c, i) {
          return (i + 2) + ". " + c.nome + " · " + c.email + (c.instituicao ? " · " + c.instituicao : "");
        }).join("\n"),
        totalAutores: t.totalAutores, apresentador: t.apresentadorNome,
        introducao: t.introducao, metodos: t.metodos, resultados: t.resultados, conclusoes: t.conclusoes,
        caracteres: t.caracteres, situacao: t.situacao, avaliadoPor: t.avaliadorNome,
        dataAvaliacao: dataHora(t.avaliadoEm), comentario: t.comentario || "", emailResultado: t.emailResultado || "",
        emailConfirmacao: t.emailConfirmacao || "",
      };
    }

    async function comissaoTrabalhos(d) {
      const s = sessaoDe(d.token, "comissao");
      if (!s) return s === null ? semSessao() : semPerfil("comissao");
      return { ok: true, avaliador: s.conta.nome || s.conta.email, trabalhos: repo.trabalhos.listar().map(trabalhoCompleto) };
    }

    // Aceita ou recusa um trabalho e avisa o primeiro autor por e-mail na hora.
    // A decisão é definitiva no site; cada trabalho recebe uma só.
    async function comissaoDecidir(d) {
      const s = sessaoDe(d.token, "comissao");
      if (!s) return s === null ? semSessao() : semPerfil("comissao");
      const decisao = DECISOES[String(d.decisao || "")];
      if (!decisao) return falha("decisao", "Escolha aceitar ou recusar.");
      const comentario = textoLongo(d.comentario, 1500);
      const protocolo = texto(d.protocolo, 20);

      const r = repo.atomico(function () {
        const t = repo.trabalhos.porProtocolo(protocolo);
        if (!t) return falha("nao_encontrado", "Trabalho não encontrado.");
        if (t.situacao !== EM_AVALIACAO) {
          return falha("ja_avaliado", "Este trabalho já foi avaliado (" + t.situacao.toLowerCase() + ") por " + (t.avaliadorNome || "outro avaliador") + ".");
        }
        repo.trabalhos.atualizar(protocolo, {
          situacao: decisao, avaliadorNome: s.conta.nome || s.conta.email, avaliadorEmail: s.conta.email,
          avaliadoEm: agora().toISOString(), comentario: comentario,
        });
        return { ok: true, trabalho: t };
      });
      if (!r.ok) return r;

      const t = r.trabalho;
      const paragrafos = ["Olá, " + t.autorNome.split(" ")[0] + "."];
      paragrafos.push("O trabalho \"" + t.titulo + "\" (protocolo " + protocolo + ") " +
        (decisao === "Aceito" ? "foi aceito" : "não foi aceito") + " pela Comissão Científica do " + cfg.EVENTO + ".");
      if (comentario) paragrafos.push("Comentário da comissão: " + comentario);
      paragrafos.push(decisao === "Aceito"
        ? "As orientações sobre a apresentação em pôster ou painel serão enviadas pela organização. O resultado também aparece na área do inscrito."
        : "Agradecemos o envio. O resultado também aparece na área do inscrito.");
      const situacao = await enviarEmail(t.autorEmail, "Resultado do trabalho " + protocolo + " · " + cfg.EVENTO, paragrafos);
      repo.trabalhos.atualizar(protocolo, { emailResultado: situacao });
      return { ok: true, protocolo: protocolo, situacao: decisao, email: situacao };
    }

    /* -------------------------------------------------------------------
       Organização: comissão, inscrições e trabalhos
       ------------------------------------------------------------------- */
    function membroDaComissao(conta) {
      let situacao = "Convite enviado em " + dataHora(conta.convidadoEm);
      if (conta.verificada && conta.senha) situacao = "Ativo";
      return { nome: conta.nome, email: conta.email, situacao: situacao };
    }

    async function orgPainel(d) {
      const s = sessaoDe(d.token, "organizacao");
      if (!s) return s === null ? semSessao() : semPerfil("organizacao");
      const inscricoes = repo.inscricoes.listar().map(function (i) {
        return {
          protocolo: i.protocolo, data: dataHora(i.criadoEm), nome: i.nome, cpf: formatarCpf(i.cpf), email: i.email,
          celular: formatarCelular(i.celular), categoria: i.categoria, instituicao: i.instituicao,
          emailConfirmacao: i.emailConfirmacao,
        };
      });
      const trabalhos = repo.trabalhos.listar().map(trabalhoCompleto);
      const comissao = repo.contas.listar().filter(function (c) { return c.comissao; }).map(membroDaComissao);
      return {
        ok: true, nome: s.conta.nome || s.conta.email, vagas: cfg.VAGAS,
        inscricoes: inscricoes, trabalhos: trabalhos, comissao: comissao,
      };
    }

    async function orgConvidar(d) {
      const s = sessaoDe(d.token, "organizacao");
      if (!s) return s === null ? semSessao() : semPerfil("organizacao");
      const nome = texto(d.nome, 120);
      if (nome.split(" ").length < 2) return falha("nome", "Informe o nome completo do avaliador.", "nome");
      const email = texto(d.email, 120).toLowerCase();
      if (!emailValido(email)) return falha("email", "Confira o e-mail.", "email");

      const r = repo.atomico(function () {
        const conta = repo.contas.porEmail(email);
        if (conta && conta.comissao) return falha("ja_na_comissao", nome + " já está na comissão.", "email");
        const momento = agora().toISOString();
        repo.contas.salvar(Object.assign({
          email: email, nome: nome, cpf: "", senha: "", verificada: false, criadaEm: momento,
        }, conta || {}, { comissao: true, convidadoEm: momento, atualizadaEm: momento, nome: conta && conta.nome ? conta.nome : nome }));
        return { ok: true };
      });
      if (!r.ok) return r;
      const situacaoEmail = await mandarConvite(email, nome);
      return { ok: true, membro: membroDaComissao(repo.contas.porEmail(email)), email: situacaoEmail };
    }

    async function orgReenviarConvite(d) {
      const s = sessaoDe(d.token, "organizacao");
      if (!s) return s === null ? semSessao() : semPerfil("organizacao");
      const email = texto(d.email, 120).toLowerCase();
      const conta = repo.contas.porEmail(email);
      if (!conta || !conta.comissao) return falha("nao_encontrado", "Este e-mail não está na comissão.");
      repo.contas.salvar(Object.assign({}, conta, { convidadoEm: agora().toISOString() }));
      const situacaoEmail = await mandarConvite(email, conta.nome);
      return { ok: true, membro: membroDaComissao(repo.contas.porEmail(email)), email: situacaoEmail };
    }

    async function orgRemoverComissao(d) {
      const s = sessaoDe(d.token, "organizacao");
      if (!s) return s === null ? semSessao() : semPerfil("organizacao");
      const email = texto(d.email, 120).toLowerCase();
      const conta = repo.contas.porEmail(email);
      if (!conta || !conta.comissao) return falha("nao_encontrado", "Este e-mail não está na comissão.");
      repo.atomico(function () {
        if (conta.cpf || cfg.ORGANIZACAO.indexOf(email) >= 0) {
          repo.contas.salvar(Object.assign({}, conta, { comissao: false, atualizadaEm: agora().toISOString() }));
        } else {
          repo.contas.remover(email);
        }
      });
      return { ok: true };
    }

    // O link do convite leva à página #/convite, onde o avaliador cria a senha
    async function mandarConvite(email, nome) {
      const token = deps.aleatorio(32);
      repo.cache.put("convite:" + deps.resumo(token), email, cfg.CONVITE_DIAS * 86400);
      return enviarEmail(email, "Convite para a Comissão Científica · " + cfg.EVENTO, [
        "Olá, " + String(nome || "").split(" ")[0] + ".",
        "Você foi convidado(a) para a Comissão Científica do " + cfg.EVENTO + ", que avalia os trabalhos enviados ao simpósio.",
        "Para criar a sua senha e entrar na área de avaliação, abra este link: " + cfg.SITE + "#/convite/" + token,
        "O link vale por " + cfg.CONVITE_DIAS + " dias. Depois, entre pelo site com este e-mail e a senha que você criar.",
      ]);
    }

    async function verConvite(d) {
      const email = emailDoConvite(d.convite);
      const conta = email && repo.contas.porEmail(email);
      if (!conta || !conta.comissao) return falha("convite_invalido", "Este convite venceu ou não vale mais. Peça um novo convite à organização.");
      return { ok: true, nome: conta.nome, email: email };
    }

    async function aceitarConvite(d) {
      const email = emailDoConvite(d.convite);
      const conta = email && repo.contas.porEmail(email);
      if (!conta || !conta.comissao) return falha("convite_invalido", "Este convite venceu ou não vale mais. Peça um novo convite à organização.");
      const senha = senhaRecebida(d.senha);
      const erroSenha = conferirSenha(senha);
      if (erroSenha) return falha("senha", erroSenha, "senha");
      gravarSenha(email, senha);
      repo.cache.remove("convite:" + deps.resumo(String(d.convite)));
      return Object.assign({ ok: true }, abrirSessao(email));
    }

    function emailDoConvite(token) {
      if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) return "";
      return repo.cache.get("convite:" + deps.resumo(token)) || "";
    }

    /* -------------------------------------------------------------------
       Contas, perfis e sessões
       ------------------------------------------------------------------- */
    // Perfis da conta. Comissão e organização só valem com o e-mail comprovado,
    // por código ou convite: a senha criada na inscrição não basta.
    function papeisDe(conta) {
      const papeis = [];
      if (!conta) return papeis;
      if (cfg.ORGANIZACAO.indexOf(conta.email) >= 0 && conta.verificada) papeis.push("organizacao");
      if (conta.comissao && conta.verificada) papeis.push("comissao");
      if (conta.cpf && repo.inscricoes.porCpf(conta.cpf)) papeis.push("inscrito");
      return papeis;
    }

    function descricaoDaConta(conta) {
      return { nome: String(conta.nome || conta.email).split(" ")[0], nomeCompleto: conta.nome || "", email: conta.email, papeis: papeisDe(conta) };
    }

    // Quem pode pedir código: inscritos, comissão e organização
    function podeTerAcesso(email) {
      const conta = repo.contas.porEmail(email);
      return !!repo.inscricoes.porEmail(email) || !!(conta && conta.comissao) || cfg.ORGANIZACAO.indexOf(email) >= 0;
    }

    // Cria ou troca a senha depois de o e-mail ser comprovado (código ou convite)
    function gravarSenha(email, senha) {
      const protegida = deps.senhas.proteger(senha);
      repo.atomico(function () {
        const momento = agora().toISOString();
        const conta = repo.contas.porEmail(email);
        const insc = repo.inscricoes.porEmail(email);
        repo.contas.salvar(Object.assign({
          email: email, nome: insc ? insc.nome : "", cpf: "", comissao: false, convidadoEm: "", criadaEm: momento,
        }, conta || {}, {
          cpf: conta && conta.cpf ? conta.cpf : insc ? insc.cpf : "",
          nome: conta && conta.nome ? conta.nome : insc ? insc.nome : "",
          senha: protegida, verificada: true, atualizadaEm: momento,
        }));
      });
    }

    function abrirSessao(email) {
      const token = deps.aleatorio(32);
      repo.cache.put("sessao:" + deps.resumo(token), email, segundosDeSessao());
      return Object.assign({ token: token }, descricaoDaConta(repo.contas.porEmail(email)));
    }

    // Sessão do token. Com "perfil", devolve false quando a conta não tem esse
    // perfil e null quando não há sessão. Cada uso renova o prazo.
    function sessaoDe(token, perfil) {
      if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) return null;
      const chave = "sessao:" + deps.resumo(token);
      const email = repo.cache.get(chave);
      if (!email) return null;
      const conta = repo.contas.porEmail(email);
      if (!conta) {
        repo.cache.remove(chave);
        return null;
      }
      repo.cache.put(chave, email, segundosDeSessao());
      if (perfil && papeisDe(conta).indexOf(perfil) < 0) return false;
      return { conta: conta, inscricao: conta.cpf ? repo.inscricoes.porCpf(conta.cpf) : null };
    }

    function segundosDeSessao() {
      return Math.max(1, cfg.SESSAO_HORAS) * 3600;
    }

    function semSessao() {
      return falha("sessao", "Sua sessão terminou. Entre de novo.");
    }

    function semPerfil(perfil) {
      const nomes = { inscrito: "inscritos", comissao: "a comissão", organizacao: "a organização" };
      return falha("sem_acesso", "Esta área é só para " + nomes[perfil] + ".");
    }

    function saudacao(email) {
      const conta = repo.contas.porEmail(email);
      const insc = repo.inscricoes.porEmail(email);
      const nome = (conta && conta.nome) || (insc && insc.nome) || "";
      return nome ? ", " + nome.split(" ")[0] : "";
    }

    /* -------------------------------------------------------------------
       Apoio
       ------------------------------------------------------------------- */
    async function enviarEmail(para, assunto, paragrafos) {
      if (cfg.TESTE) {
        assunto = "[TESTE] " + assunto;
        paragrafos = ["Este e-mail veio do ambiente de teste do site. Nada foi registrado de verdade."].concat(paragrafos);
      }
      const rodape = cfg.EVENTO + " · " + cfg.SITE;
      const html =
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#2B3140;max-width:560px">' +
        '<div style="height:5px;background:linear-gradient(90deg,#880A12,#404058,#0078A0);background-color:#880A12"></div>' +
        '<div style="padding:20px 4px">' +
        paragrafos.map(function (p) { return '<p style="margin:0 0 14px">' + escaparHtml(p) + "</p>"; }).join("") +
        '<p style="margin:24px 0 0;font-size:13px;color:#5E6675">' + escaparHtml(rodape) + "</p>" +
        "</div></div>";
      try {
        return await deps.email.enviar({ para: para, assunto: assunto, texto: paragrafos.join("\n\n") + "\n\n" + rodape, html: html });
      } catch (erro) {
        log(erro);
        return "não enviado: " + (erro && erro.message ? erro.message : erro);
      }
    }

    function hoje() {
      return partesDaData(agora()).iso;
    }

    function dentroDoPeriodo(inicio, fim) {
      const d = hoje();
      return (!inicio || d >= inicio) && (!fim || d <= fim);
    }

    function partesDaData(data) {
      const p = {};
      new Intl.DateTimeFormat("en-CA", {
        timeZone: cfg.FUSO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).formatToParts(data).forEach(function (x) { p[x.type] = x.value; });
      return { iso: p.year + "-" + p.month + "-" + p.day, br: p.day + "/" + p.month + "/" + p.year + " " + p.hour + ":" + p.minute };
    }

    function dataHora(iso) {
      if (!iso) return "";
      const data = new Date(iso);
      return isNaN(data.getTime()) ? String(iso) : partesDaData(data).br;
    }

    return { tratar: tratar, config: cfg };
  }

  /* ---------------------------------------------------------------------
     Funções puras
     --------------------------------------------------------------------- */
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

  function senhaRecebida(valor) {
    return typeof valor === "string" ? valor : "";
  }

  function conferirSenha(senha) {
    if (senha.length < CONFIG_PADRAO.SENHA_MINIMA) return "A senha precisa ter pelo menos " + CONFIG_PADRAO.SENHA_MINIMA + " caracteres.";
    if (senha.length > 100) return "A senha pode ter até 100 caracteres.";
    return "";
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

  function proximoProtocolo(prefixo, registros) {
    let maior = 0;
    registros.forEach(function (r) {
      const m = String(r.protocolo).match(/(\d+)$/);
      if (m) maior = Math.max(maior, Number(m[1]));
    });
    return prefixo + "-" + String(maior + 1).padStart(4, "0");
  }

  function escaparHtml(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }

  const exportar = { criarBanco: criarBanco, CONFIG_PADRAO: CONFIG_PADRAO, emailValido: emailValido };
  if (typeof module !== "undefined" && module.exports) module.exports = exportar;
  else raiz.RegrasDoSimposio = exportar;
})(typeof globalThis !== "undefined" ? globalThis : this);

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
