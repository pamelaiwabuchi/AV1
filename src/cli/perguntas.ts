import type { Interface } from "node:readline/promises";
import { ValidadorDataEntrada } from "../validadores/ValidadorDataEntrada.js";
import { converterData, formatarData } from "./conversores.js";
import { erro } from "./mensagens.js";

const COMO_SAIR = "Digite novamente, ou \"sair\" para voltar ao menu principal.";

export function pediuCancelamento(texto: string, zeroCancela: boolean): boolean {
    const resposta = texto.trim().toLowerCase();
    return resposta === "sair" || resposta === "cancelar" || (zeroCancela && resposta === "0");
}

export function mostrarComoCancelar(): void {
    console.log("(Para voltar ao menu principal, digite \"sair\" em qualquer campo.)");
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

        if (pediuCancelamento(texto, zeroCancela)) {
            return null;
        }

        const problema = validar(texto);

        if (problema === null) {
            return texto;
        }

        erro(problema);
        console.log(COMO_SAIR);
    }
}

export async function escolherOpcao(terminal: Interface, titulo: string, opcoes: string[], textoDoZero: string = "cancelar"): Promise<string | null> {
    console.log(`${titulo} (0 para ${textoDoZero}):`);

    opcoes.forEach((opcao, i) => {
        console.log(`  ${i + 1} - ${opcao}`);
    });

    while (true) {
        const escolha = (await terminal.question("Opção: ")).trim();

        if (pediuCancelamento(escolha, true)) {
            return null;
        }

        const escolhida = opcoes[Number(escolha) - 1];

        if (escolhida !== undefined) {
            return escolhida;
        }

        erro(`Opção inválida. Digite um número de 1 a ${opcoes.length}, ou 0 (ou "sair") para ${textoDoZero}.`);
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
            console.log("  0 - Voltar ao menu principal");
            resposta = await terminal.question("  ou digite a data (dd/mm/aaaa): ");
        }

        const texto = resposta.trim();
        resposta = undefined;

        if (pediuCancelamento(texto, true)) {
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
            erro("Data inválida. Use o formato dd/mm/aaaa.");
            console.log(COMO_SAIR);
            continue;
        }

        if (!validador.validar(data)) {
            erro(validador.obterMensagemErro());
            console.log(COMO_SAIR);
            continue;
        }

        return data;
    }
}

export async function escolherPeriodo(terminal: Interface): Promise<{ inicio: Date; fim: Date } | null> {
    const opcoes = [
        "Último mês",
        "Últimos 3 meses",
        "Últimos 6 meses",
        "Últimos 12 meses",
        "Últimos 5 anos",
        "Informar as datas"
    ];

    const escolha = await escolherOpcao(terminal, "Período do relatório", opcoes);

    if (escolha === null) {
        return null;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const inicio = new Date(hoje);

    if (escolha === "Último mês") {
        inicio.setMonth(inicio.getMonth() - 1);
    } else if (escolha === "Últimos 3 meses") {
        inicio.setMonth(inicio.getMonth() - 3);
    } else if (escolha === "Últimos 6 meses") {
        inicio.setMonth(inicio.getMonth() - 6);
    } else if (escolha === "Últimos 12 meses") {
        inicio.setFullYear(inicio.getFullYear() - 1);
    } else if (escolha === "Últimos 5 anos") {
        inicio.setFullYear(inicio.getFullYear() - 5);
    } else {
        const textoInicio = await perguntarValido(terminal, "Data inicial (dd/mm/aaaa): ", dataValida, true);

        if (textoInicio === null) {
            return null;
        }

        const dataInicio = converterData(textoInicio) as Date;

        const textoFim = await perguntarValido(terminal, "Data final (dd/mm/aaaa): ", (texto) => {
            const fim = converterData(texto);

            if (fim === null) {
                return "Data inválida. Use o formato dd/mm/aaaa.";
            }

            if (fim.getTime() < dataInicio.getTime()) {
                return "A data final precisa ser igual ou posterior à data inicial.";
            }

            return null;
        }, true);

        if (textoFim === null) {
            return null;
        }

        return { inicio: dataInicio, fim: converterData(textoFim) as Date };
    }

    inicio.setDate(inicio.getDate() + 1);

    return { inicio: inicio, fim: hoje };
}