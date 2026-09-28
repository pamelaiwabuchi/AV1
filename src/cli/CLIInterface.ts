import type { Interface } from "node:readline/promises";
import { ServicoAutenticacao } from "../servicos/ServicoAutenticacao.js";
import { ServicoOrganizacao } from "../servicos/ServicoOrganizacao.js";
import { Sessao } from "../entidades/Sessao.js";
import { PapelUsuario } from "../enums/PapelUsuario.js";
import { TelaUsuarios } from "./telas/TelaUsuarios.js";
import { TelaOrganizacoes } from "./telas/TelaOrganizacoes.js";

interface OpcaoMenu {
    texto: string;
    papeisPermitidos: PapelUsuario[];
    executar: (sessao: Sessao) => Promise<void> | void;
}

export class CLIInterface {
    private autenticacao: ServicoAutenticacao;
    private organizacao: ServicoOrganizacao;
    private sessaoAtual: Sessao | null;
    private terminal: Interface;
    private telaUsuarios: TelaUsuarios;
    private telaOrganizacoes: TelaOrganizacoes;
    private opcoes: OpcaoMenu[];

    constructor(autenticacao: ServicoAutenticacao, organizacao: ServicoOrganizacao, terminal: Interface) {
        this.autenticacao = autenticacao;
        this.organizacao = organizacao;
        this.sessaoAtual = null;
        this.terminal = terminal;

        this.telaUsuarios = new TelaUsuarios(this.autenticacao, this.terminal);
        this.telaOrganizacoes = new TelaOrganizacoes(this.organizacao, this.terminal);

        this.opcoes = [
            {
                texto: "Cadastrar usuário",
                papeisPermitidos: [PapelUsuario.ADMINISTRADOR],
                executar: () => this.telaUsuarios.cadastrar()
            },
            {
                texto: "Listar usuários",
                papeisPermitidos: [PapelUsuario.ADMINISTRADOR, PapelUsuario.AUDITOR],
                executar: () => this.telaUsuarios.listar()
            },
            {
                texto: "Alterar minha senha",
                papeisPermitidos: Object.values(PapelUsuario),
                executar: (sessao) => this.telaUsuarios.alterarSenha(sessao.getUsuario())
            },
            {
                texto: "Cadastrar organização",
                papeisPermitidos: [PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO],
                executar: () => this.telaOrganizacoes.cadastrar()
            },
            {
                texto: "Listar organizações ativas",
                papeisPermitidos: Object.values(PapelUsuario),
                executar: () => this.telaOrganizacoes.listar()
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

            const entrada = (await this.terminal.question("Opção: ")).trim();

            if (!this.autenticacao.validarToken(sessao.getToken())) {
                console.log("Sessão expirada por inatividade. Faça login novamente.");
                this.sessaoAtual = null;
                continue;
            }

            sessao.renovar();

            if (entrada === "0") {
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
        const opcaoEscolhida = opcoesDoUsuario[Number(entrada) - 1];

        if (opcaoEscolhida === undefined) {
            console.log("Opção inválida.");
            return;
        }

        await opcaoEscolhida.executar(sessao);
    }

    exibirMenuPorPapel(papel: PapelUsuario): void {
        console.log("");
        console.log("=== Menu ===");

        this.opcoesDoPapel(papel).forEach((opcao, i) => {
            console.log(`  ${i + 1} - ${opcao.texto}`);
        });

        console.log("  0 - Sair");
    }

    private opcoesDoPapel(papel: PapelUsuario): OpcaoMenu[] {
        return this.opcoes.filter((opcao) => opcao.papeisPermitidos.includes(papel));
    }

    private async fazerLogin(): Promise<void> {
        console.log("");
        const usuario = (await this.terminal.question("Usuário: ")).trim().toLowerCase();
        const senha = await this.terminal.question("Senha: ");

        try {
            this.sessaoAtual = this.autenticacao.login(usuario, senha);
            console.log(`Bem-vindo(a), ${usuario}! Papel: ${this.sessaoAtual.getPapel()}`);
        } catch (erro) {
            console.log((erro as Error).message);
        }
    }
}