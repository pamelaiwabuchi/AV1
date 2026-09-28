import { Credencial } from "../entidades/Credencial.js";
import { Sessao } from "../entidades/Sessao.js";
import { RepositorioArquivo } from "../persistencia/RepositorioArquivo.js";
import { PapelUsuario } from "../enums/PapelUsuario.js";

const ARQUIVO_CREDENCIAIS = "credenciais.json";

export class ServicoAutenticacao {
    private credenciais: Credencial[];
    private sessoesAtivas: Sessao[];
    private readonly repositorio: RepositorioArquivo;

    constructor(repositorio: RepositorioArquivo) {
        this.repositorio = repositorio;
        this.sessoesAtivas = [];

        const dadosSalvos = repositorio.listarEntidades(ARQUIVO_CREDENCIAIS);
        this.credenciais = dadosSalvos.map((dados) => Credencial.deDados(dados));
    }

    login(usuario: string, senha: string): Sessao {
        const credencial = this.credenciais.find((c) => c.autenticar(usuario, senha));

        if (credencial === undefined) {
            throw new Error("Usuário ou senha inválidos.");
        }

        credencial.atualizarUltimoAcesso();
        this.repositorio.salvarEntidade(ARQUIVO_CREDENCIAIS, credencial.paraDados());

        const sessao = new Sessao(credencial.renovarToken(), credencial.getUsuario(), credencial.getPapel());
        this.sessoesAtivas.push(sessao);

        return sessao;
    }

    logout(token: string): void {
        this.sessoesAtivas = this.sessoesAtivas.filter((s) => s.getToken() !== token);
    }

    validarToken(token: string): boolean {
        const sessao = this.sessoesAtivas.find((s) => s.getToken() === token);

        if (sessao === undefined) {
            return false;
        }

        if (!sessao.isValida()) {
            this.logout(token);
            return false;
        }

        return true;
    }

    alterarSenha(usuario: string, senhaAntiga: string, senhaNova: string): boolean {
        const credencialAtual = this.credenciais.find((c) => c.autenticar(usuario, senhaAntiga));

        if (credencialAtual === undefined) {
            return false;
        }

        const novaCredencial = Credencial.criarNova(usuario, senhaNova, credencialAtual.getPapel());

        const posicao = this.credenciais.indexOf(credencialAtual);
        this.credenciais[posicao] = novaCredencial;
        this.repositorio.salvarEntidade(ARQUIVO_CREDENCIAIS, novaCredencial.paraDados());

        return true;
    }

    cadastrarUsuario(usuario: string, senha: string, papel: PapelUsuario): void {
        const jaExiste = this.credenciais.find((c) => c.getUsuario() === usuario);

        if (jaExiste !== undefined) {
            throw new Error(`Já existe um usuário chamado "${usuario}".`);
        }

        const credencial = Credencial.criarNova(usuario, senha, papel);

        this.credenciais.push(credencial);
        this.repositorio.salvarEntidade(ARQUIVO_CREDENCIAIS, credencial.paraDados());
    }

    listarUsuarios(): Credencial[] {
        return this.credenciais;
    }
}