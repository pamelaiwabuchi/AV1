import type { Interface } from "node:readline/promises";
import { ValidadorDataEntrada } from "../validadores/ValidadorDataEntrada.js";
import { converterData, formatarData } from "./conversores.js";
import { erro } from "./mensagens.js";

export function ehCancelamento(texto: string, zeroCancela: boolean): boolean {
    const resposta = texto.trim().toLowerCase();
    return resposta === "cancelar" || (zeroCancela && resposta === "0");
}

export function mostrarComoCancelar(): void {
    console.log("(Para voltar ao menu, digite \"cancelar\" em qualquer campo.)");
}

export function mensagemDeErro(acao: () => void): string | null {
    try {
        acao();
        return null;
    } catch (e) {
        return (e as Error).message;
    }
}

export function naoVazio(mensagem: string): (texto: string) => string | null {
    return (texto) => {
        if (texto === "") {
            return mensagem;
        }

        return null;
    };
}

export function dataValida(texto: string): string | null {
    if (converterData(texto) === null) {
        return "Data inválida. Use o formato dd/mm/aaaa.";
    }

    return null;
}

export async function perguntarValido(
    terminal: Interface,
    pergunta: string,
    validar: (texto: string) => string | null,
    zeroCancela: boolean,
    informado: string | undefined = undefined
): Promise<string | null> {
    let resposta = informado;

    while (true) {
        if (resposta === undefined) {
            resposta = await terminal.question(pergunta);
        }

        const texto = resposta.trim();
        resposta = undefined;

        if (ehCancelamento(texto, zeroCancela)) {
            return null;
        }

        const problema = validar(texto);

        if (problema === null) {
            return texto;
        }

        erro(problema);
    }
}

export async function escolherOpcao(terminal: Interface, titulo: string, opcoes: string[]): Promise<string | null> {
    console.log(`${titulo} (0 para cancelar):`);

    opcoes.forEach((opcao, i) => {
        console.log(`  ${i + 1} - ${opcao}`);
    });

    while (true) {
        const escolha = (await terminal.question("Opção: ")).trim();

        if (ehCancelamento(escolha, true)) {
            return null;
        }

        const escolhida = opcoes[Number(escolha) - 1];

        if (escolhida !== undefined) {
            return escolhida;
        }

        erro(`Opção inválida. Digite um número de 1 a ${opcoes.length}, ou 0 para cancelar.`);
    }
}

export async function perguntarSimOuNao(terminal: Interface, pergunta: string): Promise<boolean | null> {
    const resposta = await perguntarValido(terminal, pergunta, (texto) => {
        const letra = texto.toUpperCase();

        if (letra !== "S" && letra !== "N") {
            return "Resposta inválida. Digite S ou N.";
        }

        return null;
    }, true);

    if (resposta === null) {
        return null;
    }

    return resposta.toUpperCase() === "S";
}

export async function perguntarDataEntrada(terminal: Interface, informada: string | undefined): Promise<Date | null> {
    const validador = new ValidadorDataEntrada();
    let resposta = informada;

    while (true) {
        if (resposta === undefined) {
            console.log("Data de entrada:");
            console.log(`  1 - Hoje (${formatarData(new Date())})`);
            console.log("  0 - Voltar ao menu");
            resposta = await terminal.question("  ou digite a data (dd/mm/aaaa): ");
        }

        const texto = resposta.trim();
        resposta = undefined;

        if (ehCancelamento(texto, true)) {
            return null;
        }

        let data: Date | null;

        if (texto === "1") {
            data = new Date();
            data.setHours(0, 0, 0, 0);
        } else {
            data = converterData(texto);
        }

        if (data === null) {
            erro("Data inválida. Use o formato dd/mm/aaaa, 1 para hoje ou 0 para voltar ao menu.");
            continue;
        }

        if (!validador.validar(data)) {
            erro(validador.obterMensagemErro());
            continue;
        }

        return data;
    }
}