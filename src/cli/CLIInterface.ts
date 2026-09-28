import type { Interface } from "node:readline/promises";
import { ServicoAutenticacao } from "../servicos/ServicoAutenticacao.js";
import { ServicoOrganizacao } from "../servicos/ServicoOrganizacao.js";
import { Sessao } from "../entidades/Sessao.js";
import { PapelUsuario } from "../enums/PapelUsuario.js";

interface OpcaoMenu {
    texto: string;
    papeisPermitidos: PapelUsuario[];
    executar: () => Promise<void> | void;
}

export class CLIInterface {
    private autenticacao: ServicoAutenticacao;
    private organizacao: ServicoOrganizacao;
    private sessaoAtual: Sessao | null;
    private terminal: Interface;
    private opcoes: OpcaoMenu[];

    constructor(autenticacao: ServicoAutenticacao, organizacao: ServicoOrganizacao, terminal: Interface) {
        this.autenticacao = autenticacao;
        this.organizacao = organizacao;
        this.sessaoAtual = null;
        this.terminal = terminal;

        this.opcoes = [
            {
                texto: "Cadastrar usuário",
                papeisPermitidos: [PapelUsuario.ADMINISTRADOR],
                executar: () => this.cadastrarUsuario()
            },
            {
                texto: "Listar usuários",
                papeisPermitidos: [PapelUsuario.ADMINISTRADOR, PapelUsuario.AUDITOR],
                executar: () => this.listarUsuarios()
            },
            {
                texto: "Alterar minha senha",
                papeisPermitidos: Object.values(PapelUsuario),
                executar: () => this.alterarSenha()
            },
            {
                texto: "Cadastrar organização",
                papeisPermitidos: [PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO],
                executar: () => this.cadastrarOrganizacao()
            },
            {
                texto: "Listar organizações ativas",
                papeisPermitidos: Object.values(PapelUsuario),
                executar: () => this.listarOrganizacoes()
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

        await opcaoEscolhida.executar();
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

    private async cadastrarUsuario(): Promise<void> {
        const nome = (await this.terminal.question("Nome do novo usuário: ")).trim().toLowerCase();

        if (nome === "") {
            console.log("O nome não pode ficar vazio.");
            return;
        }

        const jaExiste = this.autenticacao.listarUsuarios().find((c) => c.getUsuario() === nome);

        if (jaExiste !== undefined) {
            console.log(`Já existe um usuário chamado "${nome}".`);
            return;
        }

        const senha = await this.terminal.question("Senha: ");

        if (senha.trim() === "") {
            console.log("A senha não pode ficar vazia.");
            return;
        }

        const papeis = Object.values(PapelUsuario);

        console.log("Escolha o papel:");
        papeis.forEach((papel, i) => {
            console.log(`  ${i + 1} - ${papel}`);
        });

        const opcao = await this.terminal.question("Opção: ");
        const papelEscolhido = papeis[Number(opcao) - 1];

        if (papelEscolhido === undefined) {
            console.log(`Opção inválida. Digite um número de 1 a ${papeis.length}.`);
            return;
        }

        try {
            this.autenticacao.cadastrarUsuario(nome, senha, papelEscolhido);
            console.log(`Usuário "${nome}" cadastrado como ${papelEscolhido}.`);
        } catch (erro) {
            console.log((erro as Error).message);
        }
    }

    private listarUsuarios(): void {
        console.log("Usuários cadastrados:");

        for (const credencial of this.autenticacao.listarUsuarios()) {
            const ultimoAcesso = credencial.getUltimoAcesso().toLocaleString("pt-BR");
            console.log(`  ${credencial.getUsuario()} (${credencial.getPapel()}) - último acesso: ${ultimoAcesso}`);
        }
    }

    private async alterarSenha(): Promise<void> {
        const sessao = this.sessaoAtual;

        if (sessao === null) {
            return;
        }

        const senhaAtual = await this.terminal.question("Senha atual: ");
        const senhaNova = await this.terminal.question("Nova senha: ");
        const confirmacao = await this.terminal.question("Confirme a nova senha: ");

        if (senhaNova.trim() === "") {
            console.log("A nova senha não pode ficar vazia.");
            return;
        }

        if (senhaNova !== confirmacao) {
            console.log("As senhas novas não conferem.");
            return;
        }

        const alterou = this.autenticacao.alterarSenha(sessao.getUsuario(), senhaAtual, senhaNova);

        if (alterou) {
            console.log("Senha alterada com sucesso.");
        } else {
            console.log("Senha atual incorreta. Nada foi alterado.");
        }
    }

    private async cadastrarOrganizacao(): Promise<void> {
        const razaoSocial = await this.terminal.question("Razão social: ");
        const cnpj = await this.terminal.question("CNPJ: ");
        const inscricaoEstadual = await this.terminal.question("Inscrição estadual: ");
        const enderecoCompleto = await this.terminal.question("Endereço completo: ");
        const telefone = await this.terminal.question("Telefone: ");
        const email = await this.terminal.question("E-mail: ");

        try {
            const nova = this.organizacao.cadastrarOrganizacao({
                razaoSocial,
                cnpj,
                inscricaoEstadual,
                enderecoCompleto,
                telefone,
                email
            });

            console.log(`Organização cadastrada com o código ${nova.getId()}.`);
        } catch (erro) {
            console.log((erro as Error).message);
        }
    }

    private listarOrganizacoes(): void {
        const organizacoes = this.organizacao.listarOrganizacoesAtivas();

        if (organizacoes.length === 0) {
            console.log("Nenhuma organização cadastrada.");
            return;
        }

        console.log("Organizações ativas:");

        for (const org of organizacoes) {
            console.log(`  ${org.getId()} - ${org.getRazaoSocial()} - CNPJ ${org.getCnpj()}`);
        }
    }
}