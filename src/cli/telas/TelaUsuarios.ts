import type { Interface } from "node:readline/promises";
import { ServicoAutenticacao } from "../../servicos/ServicoAutenticacao.js";
import { PapelUsuario } from "../../enums/PapelUsuario.js";
import { HistoricoComandos } from "../HistoricoComandos.js";
import { escolherOpcao, mostrarComoCancelar, perguntarValido } from "../perguntas.js";
import { sucesso, aviso, erro } from "../mensagens.js";

export class TelaUsuarios {
    private autenticacao: ServicoAutenticacao;
    private terminal: Interface;
    private historico: HistoricoComandos;

    constructor(autenticacao: ServicoAutenticacao, terminal: Interface, historico: HistoricoComandos) {
        this.autenticacao = autenticacao;
        this.terminal = terminal;
        this.historico = historico;
    }

    async cadastrar(): Promise<void> {
        mostrarComoCancelar();

        const nomeDigitado = await perguntarValido(this.terminal, "Nome do novo usuário: ", (texto) => {
            if (texto === "") {
                return "O nome não pode ficar vazio.";
            }

            if (texto.toLowerCase() === "sair") {
                return "O nome \"sair\" é reservado para encerrar o sistema. Escolha outro nome.";
            }

            const jaExiste = this.autenticacao.listarUsuarios().find((c) => c.getUsuario() === texto.toLowerCase());

            if (jaExiste !== undefined) {
                return `Já existe um usuário chamado "${texto.toLowerCase()}".`;
            }

            return null;
        }, true);

        if (nomeDigitado === null) {
            aviso("Cadastro de usuário cancelado.");
            return;
        }

        const nome = nomeDigitado.toLowerCase();

        let senha = "";

        while (senha.trim() === "") {
            senha = await this.historico.perguntarSenha(this.terminal, "Senha: ");

            if (senha.trim() === "") {
                erro("A senha não pode ficar vazia.");
            }
        }

        const papelEscolhido = (await escolherOpcao(this.terminal, "Escolha o papel", Object.values(PapelUsuario))) as PapelUsuario | null;

        if (papelEscolhido === null) {
            aviso("Cadastro de usuário cancelado.");
            return;
        }

        try {
            this.autenticacao.cadastrarUsuario(nome, senha, papelEscolhido);
            sucesso(`Usuário "${nome}" cadastrado como ${papelEscolhido}.`);
        } catch (e) {
            erro((e as Error).message);
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
        const senhaAtual = await this.historico.perguntarSenha(this.terminal, "Senha atual: ");
        const senhaNova = await this.historico.perguntarSenha(this.terminal, "Nova senha: ");
        const confirmacao = await this.historico.perguntarSenha(this.terminal, "Confirme a nova senha: ");

        if (senhaNova.trim() === "") {
            erro("A nova senha não pode ficar vazia.");
            return;
        }

        if (senhaNova !== confirmacao) {
            erro("As senhas novas não conferem.");
            return;
        }

        const alterou = this.autenticacao.alterarSenha(usuario, senhaAtual, senhaNova);

        if (alterou) {
            sucesso("Senha alterada com sucesso.");
        } else {
            erro("Senha atual incorreta. Nada foi alterado.");
        }
    }
}