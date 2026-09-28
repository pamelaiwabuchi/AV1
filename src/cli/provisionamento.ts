import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Interface } from "node:readline/promises";
import { CriptografiaArquivo } from "../persistencia/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../persistencia/RepositorioArquivo.js";
import { ServicoAutenticacao } from "../servicos/ServicoAutenticacao.js";
import { ServicoJournal } from "../servicos/ServicoJournal.js";
import { PapelUsuario } from "../enums/PapelUsuario.js";
import { HistoricoComandos } from "./HistoricoComandos.js";
import { sucesso, erro } from "./mensagens.js";

export const PASTA_DADOS = "data";
const CAMINHO_CONFIG = join(PASTA_DADOS, "config.json");
const USUARIO_ADMIN = "admin";

export async function obterChaveMestra(terminal: Interface, historico: HistoricoComandos): Promise<string> {
    if (existsSync(CAMINHO_CONFIG)) {
        const config = JSON.parse(readFileSync(CAMINHO_CONFIG, "utf8"));
        return config.chaveMestra;
    }

    console.log("Arquivo mestre não encontrado. Iniciando provisionamento...");

    let senha = "";

    while (true) {
        senha = await historico.perguntarSenha(terminal, "Defina a senha do administrador: ");
        const confirmacao = await historico.perguntarSenha(terminal, "Confirme a senha: ");

        if (senha.trim() === "") {
            erro("A senha não pode ficar vazia.");
        } else if (senha !== confirmacao) {
            erro("As senhas não conferem. Tente de novo.");
        } else {
            break;
        }
    }

    const chave = new CriptografiaArquivo().gerarChave();

    const journal = new ServicoJournal(PASTA_DADOS, chave);
    journal.definirUsuario("provisionamento");
    journal.registrar("PROVISIONAMENTO", "sistema", null, { administrador: USUARIO_ADMIN });

    const repositorio = new RepositorioArquivo(PASTA_DADOS, chave, journal);
    const autenticacao = new ServicoAutenticacao(repositorio);
    autenticacao.cadastrarUsuario(USUARIO_ADMIN, senha, PapelUsuario.ADMINISTRADOR);

    const config = {
        chaveMestra: chave,
        administrador: USUARIO_ADMIN
    };

    mkdirSync(PASTA_DADOS, { recursive: true });
    writeFileSync(CAMINHO_CONFIG, JSON.stringify(config, null, 4));

    sucesso(`Provisionamento concluído. Usuário "${USUARIO_ADMIN}" criado.`);
    console.log(`Faça login com o usuário "${USUARIO_ADMIN}" e a senha que você acabou de definir.`);
    console.log("Os demais usuários são cadastrados pelo administrador, no menu.");

    return chave;
}