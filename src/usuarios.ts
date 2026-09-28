import { createInterface } from "node:readline/promises";
import { gerarHash } from "./criptografia.js";
import { ler, salvar } from "./armazenamento.js";
import { lerConfig } from "./provisionamento.js";
import { Papel } from "./tipos.js";
import type { Usuario } from "./tipos.js";

const ARQUIVO_CREDENCIAIS = "credenciais.json";

export async function cadastrarUsuario(): Promise<void> {
    const config = lerConfig();

    const terminal = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const nome = (await terminal.question("Nome do novo usuário: ")).trim().toLowerCase();

    if (nome === "") {
        terminal.close();
        console.log("O nome não pode ficar vazio.");
        return;
    }

    const usuarios = ler<Usuario[]>(ARQUIVO_CREDENCIAIS, config.chaveMestra) ?? [];
    const todosUsuarios = [config.administrador, ...usuarios];

    const jaExiste = todosUsuarios.find((u) => u.usuario === nome);

    if (jaExiste) {
        terminal.close();
        console.log(`Já existe um usuário chamado "${nome}".`);
        return;
    }

    const senha = await terminal.question("Senha: ");

    const opcoesPapel = Object.values(Papel);

    console.log("Escolha o papel:");
    for (let i = 0; i < opcoesPapel.length; i++) {
        console.log(`  ${i + 1} - ${opcoesPapel[i]}`);
    }

    const opcaoDigitada = await terminal.question("Opção: ");

    terminal.close();

    if (senha.trim() === "") {
        console.log("A senha não pode ficar vazia.");
        return;
    }

    const papelEscolhido = opcoesPapel[Number(opcaoDigitada) - 1];

    if (papelEscolhido === undefined) {
        console.log("Opção inválida. Digite um número de 1 a 4.");
        return;
    }

    const novoUsuario: Usuario = {
        usuario: nome,
        hashSenha: gerarHash(senha),
        papel: papelEscolhido
    };

    usuarios.push(novoUsuario);

    salvar(ARQUIVO_CREDENCIAIS, usuarios, config.chaveMestra);

    console.log(`Usuário "${nome}" cadastrado como ${papelEscolhido}.`);
}

export function listarUsuarios(): void {
    const config = lerConfig();

    const usuarios = ler<Usuario[]>(ARQUIVO_CREDENCIAIS, config.chaveMestra) ?? [];
    const todosUsuarios = [config.administrador, ...usuarios];

    console.log("Usuários cadastrados:");
    for (const u of todosUsuarios) {
        console.log(`  ${u.usuario} (${u.papel})`);
    }
}