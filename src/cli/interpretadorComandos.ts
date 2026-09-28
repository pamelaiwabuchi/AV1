export interface ComandoInterpretado {
    nome: string;
    parametros: Record<string, string>;
}

export function dividirEmPartes(linha: string): string[] {
    const partes: string[] = [];
    let atual = "";
    let entreAspas = false;

    for (const caractere of linha) {
        if (caractere === "\"") {
            entreAspas = !entreAspas;
            continue;
        }

        if (caractere === " " && !entreAspas) {
            if (atual !== "") {
                partes.push(atual);
                atual = "";
            }
            continue;
        }

        atual = atual + caractere;
    }

    if (atual !== "") {
        partes.push(atual);
    }

    return partes;
}

export function interpretarComando(linha: string): ComandoInterpretado {
    const partes = dividirEmPartes(linha.trim());
    const palavrasDoNome: string[] = [];
    const parametros: Record<string, string> = {};

    let lendoNome = true;
    let parametroAtual: string | null = null;

    for (const parte of partes) {
        if (parte.startsWith("--")) {
            lendoNome = false;
            parametroAtual = parte.slice(2).toLowerCase();
            continue;
        }

        if (lendoNome) {
            palavrasDoNome.push(parte.toLowerCase());
            continue;
        }

        if (parametroAtual !== null) {
            parametros[parametroAtual] = parte;
            parametroAtual = null;
        }
    }

    return {
        nome: palavrasDoNome.join(" "),
        parametros: parametros
    };
}