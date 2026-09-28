let certos = 0;
let errados = 0;

function ondeFoiChamado(): string {
    const linhas = (new Error().stack ?? "").split("\n");
    const chamada = linhas.find((linha) => linha.includes("tests") && !linha.includes("conferencia"));

    if (chamada === undefined) {
        return "(não foi possível descobrir)";
    }

    const trecho = chamada.match(/tests[\/\\][^)]+/);

    if (trecho === null) {
        return chamada.trim();
    }

    return trecho[0];
}

export function conferir(descricao: string, obtido: unknown, esperado: unknown): void {
    const obtidoTexto = JSON.stringify(obtido);
    const esperadoTexto = JSON.stringify(esperado);

    if (obtidoTexto === esperadoTexto) {
        certos = certos + 1;
        console.log(`  [OK]      ${descricao}`);
    } else {
        errados = errados + 1;
        console.log(`  [FALHOU]  ${descricao}`);
        console.log(`            esperado: ${esperadoTexto}`);
        console.log(`            obtido:   ${obtidoTexto}`);
        console.log(`            onde:     ${ondeFoiChamado()}`);
    }
}

export function conferirErro(descricao: string, acao: () => void, mensagemEsperada: string): void {
    let mensagemObtida = "(nenhum erro aconteceu)";

    try {
        acao();
    } catch (e) {
        mensagemObtida = (e as Error).message;
    }

    conferir(descricao, mensagemObtida, mensagemEsperada);
}

export function mostrarResultado(): void {
    console.log("");
    console.log(`Resultado: ${certos} certos, ${errados} com falha`);

    if (errados > 0) {
        process.exitCode = 1;
    }
}