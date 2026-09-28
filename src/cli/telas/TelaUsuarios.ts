import type { Interface } from "node:readline/promises";
import { ServicoAutenticacao } from "../../servicos/ServicoAutenticacao.js";
import { PapelUsuario } from "../../enums/PapelUsuario.js";

export class TelaUsuarios {
    private autenticacao: ServicoAutenticacao;
    private terminal: Interface;

    constructor(autenticacao: ServicoAutenticacao, terminal: Interface) {
        this.autenticacao = autenticacao;
        this.terminal = terminal;
    }

    async cadastrar(): Promise<void> {
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

    listar(): void {
        console.log("Usuários cadastrados:");

        for (const credencial of this.autenticacao.listarUsuarios()) {
            const ultimoAcesso = credencial.getUltimoAcesso().toLocaleString("pt-BR");
            console.log(`  ${credencial.getUsuario()} (${credencial.getPapel()}) - último acesso: ${ultimoAcesso}`);
        }
    }

    async alterarSenha(usuario: string): Promise<void> {
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

        const alterou = this.autenticacao.alterarSenha(usuario, senhaAtual, senhaNova);

        if (alterou) {
            console.log("Senha alterada com sucesso.");
        } else {
            console.log("Senha atual incorreta. Nada foi alterado.");
        }
    }
}