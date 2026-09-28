import { createInterface } from "node:readline/promises";
import { gerarHash } from "./criptografia.js";
import { ler } from "./armazenamento.js";
import { lerConfig } from "./provisionamento.js";
import type { Usuario } from "./tipos.js";

export async function fazerLogin(): Promise<Usuario | null> {
    const config = lerConfig();

    const terminal = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const nomeDigitado = (await terminal.question("Usuário: ")).trim().toLowerCase();
    const senhaDigitada = await terminal.question("Senha: ");

    terminal.close();

    const hashDigitado = gerarHash(senhaDigitada);

    // tenta abrir credenciais.json com a chave mestra
    const outrosUsuarios = ler<Usuario[]>("credenciais.json", config.chaveMestra) ?? [];
    const todosUsuarios = [config.administrador, ...outrosUsuarios];

    const encontrado = todosUsuarios.find((u) => u.usuario === nomeDigitado);

    if (!encontrado || encontrado.hashSenha !== hashDigitado) {
        console.log("Usuário ou senha inválidos.");
        return null;
    }

    console.log(`Bem-vindo(a), ${encontrado.usuario}! Papel: ${encontrado.papel}`);
    return encontrado;
}