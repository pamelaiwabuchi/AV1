import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import type { Config } from './tipos.js';
import { Papel } from "./tipos.js";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { gerarChave, gerarHash } from "./criptografia.js";

const PASTA_DADOS = "data";
const CAMINHO_CONFIG = join(PASTA_DADOS, "config.json");

export async function iniciarSistema(): Promise<void> {
    if (existsSync(CAMINHO_CONFIG)) {
        console.log("Sistema já configurado.");
        return;
    }

    console.log("Arquivo mestre não encontrado. Iniciando provisionamento...");
    await provisionar();
}

async function provisionar(): Promise<void> {
    const terminal = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const senha = await terminal.question("Defina a senha do administrador: ");
    const confirmacao = await terminal.question("Confirme a senha: ");

    terminal.close();

    if (senha !== confirmacao) {
        console.log("As senhas não conferem. Provisionamento cancelado.");
        return;
    }

    const config = {
        chaveMestra: gerarChave(),
        administrador: {
            usuario: "admin",
            hashSenha: gerarHash(senha),
            papel: Papel.Administrador
        }
    };

    mkdirSync(PASTA_DADOS, { recursive: true });
    writeFileSync(CAMINHO_CONFIG, JSON.stringify(config, null, 4));

    console.log("Provisionamento concluído. Usuário 'admin' criado.");
}

export function lerConfig(): Config {
    const texto = readFileSync(CAMINHO_CONFIG, 'utf8');
    return JSON.parse(texto) as Config;
}