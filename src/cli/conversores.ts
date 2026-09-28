export function converterData(texto: string): Date | null {
    const partes = texto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (partes === null) {
        return null;
    }

    const dia = Number(partes[1]);
    const mes = Number(partes[2]);
    const ano = Number(partes[3]);

    const data = new Date(ano, mes - 1, dia);

    if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
        return null;
    }

    return data;
}

export function converterValor(texto: string): number | null {
    const limpo = texto.trim().replaceAll(".", "").replace(",", ".");

    if (limpo === "") {
        return null;
    }

    const valor = Number(limpo);

    if (Number.isNaN(valor) || valor < 0) {
        return null;
    }

    return valor;
}

export function formatarData(data: Date): string {
    return data.toLocaleDateString("pt-BR");
}

export function formatarValor(valor: number): string {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}