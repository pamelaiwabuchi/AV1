import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Interface } from "node:readline/promises";
import { CriptografiaArquivo } from "./CriptografiaArquivo.js";
import { RepositorioArquivo } from "./RepositorioArquivo.js";
import { ServicoAutenticacao } from "./ServicoAutenticacao.js";
import { PapelUsuario } from "../enums/PapelUsuario.js";

export const PASTA_DADOS = "data";
const CAMINHO_CONFIG = join(PASTA_DADOS, "config.json");
const USUARIO_ADMIN = "admin";

export async function obterChaveMestra(terminal: Interface): Promise<string> {
    if (existsSync(CAMINHO_CONFIG)) {
        const config = JSON.parse(readFileSync(CAMINHO_CONFIG, "utf8"));
        return config.chaveMestra;
    }

    console.log("Arquivo mestre não encontrado. Iniciando provisionamento...");

    let senha = "";

    while (true) {
        senha = await terminal.question("Defina a senha do administrador: ");
        const confirmacao = await terminal.question("Confirme a senha: ");

        if (senha.trim() === "") {
            console.log("A senha não pode ficar vazia.");
        } else if (senha !== confirmacao) {
            console.log("As senhas não conferem. Tente de novo.");
        } else {
            break;
        }
    }

    const chave = new CriptografiaArquivo().gerarChave();

    const repositorio = new RepositorioArquivo(PASTA_DADOS, chave);
    const autenticacao = new ServicoAutenticacao(repositorio);
    autenticacao.cadastrarUsuario(USUARIO_ADMIN, senha, PapelUsuario.ADMINISTRADOR);

    const config = {
        chaveMestra: chave,
        administrador: USUARIO_ADMIN
    };

    mkdirSync(PASTA_DADOS, { recursive: true });
    writeFileSync(CAMINHO_CONFIG, JSON.stringify(config, null, 4));

    console.log(`Provisionamento concluído. Usuário "${USUARIO_ADMIN}" criado.`);
    console.log(`Faça login com o usuário "${USUARIO_ADMIN}" e a senha que você acabou de definir.`);
    console.log("Os demais usuários são cadastrados pelo administrador, no menu.");

    return chave;
}