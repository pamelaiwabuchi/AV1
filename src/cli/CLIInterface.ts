import type { Interface } from "node:readline/promises";
import { ServicoAutenticacao } from "../servicos/ServicoAutenticacao.js";
import { ServicoOrganizacao } from "../servicos/ServicoOrganizacao.js";
import { ServicoLote } from "../servicos/ServicoLote.js";
import { ServicoEquipamento } from "../servicos/ServicoEquipamento.js";
import { ServicoJournal } from "../servicos/ServicoJournal.js";
import { Sessao } from "../entidades/Sessao.js";
import { PapelUsuario } from "../enums/PapelUsuario.js";
import { HistoricoComandos } from "./HistoricoComandos.js";
import { interpretarComando } from "./interpretadorComandos.js";
import { sucesso, aviso, erro } from "./mensagens.js";
import { TelaUsuarios } from "./telas/TelaUsuarios.js";
import { TelaOrganizacoes } from "./telas/TelaOrganizacoes.js";
import { TelaLotes } from "./telas/TelaLotes.js";
import { TelaEquipamentos } from "./telas/TelaEquipamentos.js";
import { TelaJournal } from "./telas/TelaJournal.js";

interface OpcaoMenu {
    texto: string;
    comando: string;
    uso: string;
    papeisPermitidos: PapelUsuario[];
    executar: (sessao: Sessao, parametros: Record<string, string>) => Promise<void> | void;
}

const TODOS = Object.values(PapelUsuario);
const ADMIN = PapelUsuario.ADMINISTRADOR;
const OPERADOR = PapelUsuario.OPERADOR_CADASTRO;
const GESTOR = PapelUsuario.GESTOR_ALMOXARIFADO;
const AUDITOR = PapelUsuario.AUDITOR;

export class CLIInterface {
    private autenticacao: ServicoAutenticacao;
    private organizacao: ServicoOrganizacao;
    private lote: ServicoLote;
    private equipamento: ServicoEquipamento;
    private journal: ServicoJournal;
    private sessaoAtual: Sessao | null;
    private terminal: Interface;
    private historico: HistoricoComandos;
    private telaUsuarios: TelaUsuarios;
    private telaOrganizacoes: TelaOrganizacoes;
    private telaLotes: TelaLotes;
    private telaEquipamentos: TelaEquipamentos;
    private telaJournal: TelaJournal;
    private opcoes: OpcaoMenu[];

    constructor(
        autenticacao: ServicoAutenticacao,
        organizacao: ServicoOrganizacao,
        lote: ServicoLote,
        equipamento: ServicoEquipamento,
        journal: ServicoJournal,
        terminal: Interface,
        historico: HistoricoComandos
    ) {
        this.autenticacao = autenticacao;
        this.organizacao = organizacao;
        this.lote = lote;
        this.equipamento = equipamento;
        this.journal = journal;
        this.sessaoAtual = null;
        this.terminal = terminal;
        this.historico = historico;

        this.telaUsuarios = new TelaUsuarios(this.autenticacao, this.terminal, this.historico);
        this.telaOrganizacoes = new TelaOrganizacoes(this.organizacao, this.terminal);
        this.telaLotes = new TelaLotes(this.lote, this.equipamento, this.terminal);
        this.telaEquipamentos = new TelaEquipamentos(this.lote, this.equipamento, this.terminal);
        this.telaJournal = new TelaJournal(this.journal, this.terminal);

        this.opcoes = [
            {
                texto: "Cadastrar usuário",
                comando: "usuario criar",
                uso: "usuario criar",
                papeisPermitidos: [ADMIN],
                executar: () => this.telaUsuarios.cadastrar()
            },
            {
                texto: "Listar usuários",
                comando: "usuario listar",
                uso: "usuario listar",
                papeisPermitidos: [ADMIN, AUDITOR],
                executar: () => this.telaUsuarios.listar()
            },
            {
                texto: "Alterar minha senha",
                comando: "senha alterar",
                uso: "senha alterar",
                papeisPermitidos: TODOS,
                executar: (sessao) => this.telaUsuarios.alterarSenha(sessao.getUsuario())
            },
            {
                texto: "Cadastrar organização",
                comando: "organizacao criar",
                uso: "organizacao criar",
                papeisPermitidos: [ADMIN, OPERADOR],
                executar: () => this.telaOrganizacoes.cadastrar()
            },
            {
                texto: "Listar organizações ativas",
                comando: "organizacao listar",
                uso: "organizacao listar",
                papeisPermitidos: TODOS,
                executar: () => this.telaOrganizacoes.listar()
            },
            {
                texto: "Cadastrar contrato",
                comando: "contrato criar",
                uso: "contrato criar --org <código>",
                papeisPermitidos: [ADMIN, OPERADOR],
                executar: (_sessao, parametros) => this.telaOrganizacoes.cadastrarContrato(parametros)
            },
            {
                texto: "Renovar contrato",
                comando: "contrato renovar",
                uso: "contrato renovar --org <código>",
                papeisPermitidos: [ADMIN, OPERADOR],
                executar: (_sessao, parametros) => this.telaOrganizacoes.renovarContrato(parametros)
            },
            {
                texto: "Consultar contrato",
                comando: "contrato consultar",
                uso: "contrato consultar --org <código>",
                papeisPermitidos: TODOS,
                executar: (_sessao, parametros) => this.telaOrganizacoes.consultarContrato(parametros)
            },
            {
                texto: "Registrar lote",
                comando: "lote criar",
                uso: "lote criar --org <código> --nf <número> --transp <nome> --data <dd/mm/aaaa> --obs <texto>",
                papeisPermitidos: [ADMIN, GESTOR],
                executar: (_sessao, parametros) => this.telaLotes.registrar(parametros)
            },
            {
                texto: "Consultar lotes por período",
                comando: "lote periodo",
                uso: "lote periodo --inicio <dd/mm/aaaa> --fim <dd/mm/aaaa>",
                papeisPermitidos: TODOS,
                executar: (_sessao, parametros) => this.telaLotes.consultarPorPeriodo(parametros)
            },
            {
                texto: "Adicionar equipamentos a um lote",
                comando: "equipamento adicionar",
                uso: "equipamento adicionar --lote <código>",
                papeisPermitidos: [ADMIN, GESTOR],
                executar: (sessao, parametros) => this.telaLotes.adicionarEquipamentos(sessao.getUsuario(), parametros)
            },
            {
                texto: "Iniciar triagem de um lote",
                comando: "triagem iniciar",
                uso: "triagem iniciar --lote <código>",
                papeisPermitidos: [ADMIN, GESTOR],
                executar: (sessao, parametros) => this.telaLotes.iniciarTriagem(sessao.getUsuario(), parametros)
            },
            {
                texto: "Avaliar equipamento (triagem)",
                comando: "equipamento avaliar",
                uso: "equipamento avaliar --codigo <código de barras>",
                papeisPermitidos: [ADMIN, GESTOR],
                executar: (sessao, parametros) => this.telaLotes.avaliarEquipamento(sessao.getUsuario(), parametros)
            },
            {
                texto: "Relatório de triagem de um lote",
                comando: "lote relatorio",
                uso: "lote relatorio --lote <código>",
                papeisPermitidos: TODOS,
                executar: (_sessao, parametros) => this.telaLotes.relatorioTriagem(parametros)
            },
            {
                texto: "Movimentar equipamento (desmonte ou destino final)",
                comando: "equipamento movimentar",
                uso: "equipamento movimentar --codigo <código de barras>",
                papeisPermitidos: [ADMIN, GESTOR],
                executar: (sessao, parametros) => this.telaEquipamentos.movimentar(sessao.getUsuario(), parametros)
            },
            {
                texto: "Rastrear equipamento",
                comando: "equipamento rastrear",
                uso: "equipamento rastrear --codigo <código de barras>",
                papeisPermitidos: TODOS,
                executar: (_sessao, parametros) => this.telaEquipamentos.rastrear(parametros)
            },
            {
                texto: "Consultar journal de transações",
                comando: "journal consultar",
                uso: "journal consultar --inicio <dd/mm/aaaa> --fim <dd/mm/aaaa>",
                papeisPermitidos: [ADMIN, AUDITOR],
                executar: (_sessao, parametros) => this.telaJournal.consultarPorPeriodo(parametros)
            }
        ];
    }

    async iniciarLoop(): Promise<void> {
        while (true) {
            const sessao = this.sessaoAtual;

            if (sessao === null) {
                await this.fazerLogin();
                continue;
            }

            this.exibirMenuPorPapel(sessao.getPapel());
            this.historico.esquecerRespostas();

            const entrada = (await this.terminal.question("Opção ou comando: ")).trim();

            if (entrada === "") {
                continue;
            }

            this.historico.registrarComando(entrada);

            if (!this.autenticacao.validarToken(sessao.getToken())) {
                this.journal.registrar("SESSAO_EXPIRADA", "sessao", null, { usuario: sessao.getUsuario() });
                this.journal.definirUsuario("sistema");
                aviso("Sessão expirada por inatividade. Faça login novamente.");
                this.sessaoAtual = null;
                continue;
            }

            sessao.renovar();

            if (entrada === "0" || entrada.toLowerCase() === "sair") {
                this.journal.registrar("LOGOUT", "sessao", null, { usuario: sessao.getUsuario() });
                this.autenticacao.logout(sessao.getToken());
                console.log("Até logo!");
                break;
            }

            await this.processarComando(entrada);
        }

        this.terminal.close();
    }

    async processarComando(entrada: string): Promise<void> {
        const sessao = this.sessaoAtual;

        if (sessao === null) {
            return;
        }

        const opcoesDoUsuario = this.opcoesDoPapel(sessao.getPapel());

        if (/^\d+$/.test(entrada)) {
            const opcaoEscolhida = opcoesDoUsuario[Number(entrada) - 1];

            if (opcaoEscolhida === undefined) {
                aviso(`Opção inválida. Digite um número de 0 a ${opcoesDoUsuario.length}, ou "ajuda".`);
                return;
            }

            this.journal.registrar(`ACAO: ${opcaoEscolhida.texto}`, "cli", null, null);
            await opcaoEscolhida.executar(sessao, {});
            return;
        }

        const comando = interpretarComando(entrada);

        if (comando.nome === "ajuda") {
            this.mostrarAjuda(sessao.getPapel());
            return;
        }

        const opcao = this.opcoes.find((o) => o.comando === comando.nome);

        if (opcao === undefined) {
            aviso(`Comando desconhecido: "${comando.nome}". Digite "ajuda" para ver os comandos disponíveis.`);
            return;
        }

        if (!opcao.papeisPermitidos.includes(sessao.getPapel())) {
            aviso(`Você não tem permissão para usar o comando "${opcao.comando}".`);
            return;
        }

        this.journal.registrar(`COMANDO: ${entrada}`, "cli", null, null);
        await opcao.executar(sessao, comando.parametros);
    }

    exibirMenuPorPapel(papel: PapelUsuario): void {
        console.log("");
        console.log("=== Menu ===");

        this.opcoesDoPapel(papel).forEach((opcao, i) => {
            console.log(`  ${i + 1} - ${opcao.texto}  (${opcao.comando})`);
        });

        console.log("  0 - Sair  (sair)");
        console.log("Digite o número, um comando, ou \"ajuda\". Use Tab para completar os comandos.");
    }

    completar(linha: string): [string[], string] {
        const sessao = this.sessaoAtual;

        if (sessao === null) {
            return [[], linha];
        }

        const comandos = this.opcoesDoPapel(sessao.getPapel()).map((o) => o.comando);
        comandos.push("ajuda", "sair");

        const digitado = linha.trimStart().toLowerCase();
        const encontrados = comandos.filter((c) => c.startsWith(digitado));

        if (encontrados.length === 0) {
            return [comandos, linha];
        }

        return [encontrados, linha];
    }

    private mostrarAjuda(papel: PapelUsuario): void {
        console.log("Comandos disponíveis para o seu papel:");

        for (const opcao of this.opcoesDoPapel(papel)) {
            console.log(`  ${opcao.uso}`);
            console.log(`      ${opcao.texto}`);
        }

        console.log("  sair");
        console.log("Os parâmetros que você não informar serão perguntados em seguida.");
        console.log("Para valores com espaço, use aspas: --transp \"Trans Rápida\"");
    }

    private opcoesDoPapel(papel: PapelUsuario): OpcaoMenu[] {
        return this.opcoes.filter((opcao) => opcao.papeisPermitidos.includes(papel));
    }

    private async fazerLogin(): Promise<void> {
        console.log("");
        const usuario = (await this.terminal.question("Usuário: ")).trim().toLowerCase();
        const senha = await this.historico.perguntarSenha(this.terminal, "Senha: ");

        this.journal.definirUsuario(usuario);

        try {
            this.sessaoAtual = this.autenticacao.login(usuario, senha);
            this.journal.registrar("LOGIN_SUCESSO", "sessao", null, { usuario: usuario });
            sucesso(`Bem-vindo(a), ${usuario}! Papel: ${this.sessaoAtual.getPapel()}`);
        } catch (e) {
            this.journal.definirUsuario("sistema");
            this.journal.registrar("LOGIN_FALHA", "sessao", null, { usuarioInformado: usuario });
            erro((e as Error).message);
        }
    }
}