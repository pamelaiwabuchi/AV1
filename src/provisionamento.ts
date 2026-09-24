import { existsSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { gerarChave, gerarHash } from "./criptografia.js";

const CAMINHO_CONFIG = join("data", "config.json");

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

    const chave = gerarChave();
    const hashSenha = gerarHash(senha);

    console.log("Chave gerada:", chave);
    console.log("Hash da senha:", hashSenha);

    const config = {
        chaveMestra: 
    }
}