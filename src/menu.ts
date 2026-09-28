import { createInterface } from "node:readline/promises";
import { Papel } from "./tipos.js";
import type { Usuario } from "./tipos.js";
import { cadastrarUsuario, listarUsuarios } from "./usuarios.js";

const LIMITE_INATIVIDADE_MS = 10 * 1000;

interface OpcaoMenu {
    texto: string;
    papeisPermitidos: Papel[];
    executar: () => void | Promise<void>;
}

const OPCOES: OpcaoMenu[] = [
    {
        texto: "Cadastrar usuário",
        papeisPermitidos: [Papel.Administrador],
        executar: cadastrarUsuario
    },
    {
        texto: "Listar usuários",
        papeisPermitidos: [Papel.Administrador, Papel.Auditor],
        executar: listarUsuarios
    }
];

export async function abrirMenu(usuario: Usuario): Promise<"sair" | "expirou"> {
    const opcoesDoUsuario = OPCOES.filter((opcao) => opcao.papeisPermitidos.includes(usuario.papel));

    let ultimaAtividade = Date.now();

    while (true) {
        console.log("");
        console.log("=== Menu ===");
        opcoesDoUsuario.forEach((opcao, i) => {
            console.log(`  ${i + 1} - ${opcao.texto}`);
        });
        console.log("  0 - Sair");

        const terminal = createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const escolha = (await terminal.question("Opção: ")).trim();

        terminal.close();

        if (Date.now() - ultimaAtividade > LIMITE_INATIVIDADE_MS) {
            console.log("Sessão expirada por inatividade. Faça login novamente.");
            return "expirou";
        }

        ultimaAtividade = Date.now();

        if (escolha === "0") {
            console.log("Até logo!");
            return "sair";
        }

        const opcaoEscolhida = opcoesDoUsuario[Number(escolha) - 1];

        if (opcaoEscolhida === undefined) {
            console.log("Opção inválida.");
            continue;
        }

        await opcaoEscolhida.executar();

        ultimaAtividade = Date.now();
    }
}

