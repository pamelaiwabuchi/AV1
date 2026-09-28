const LINHA = "─".repeat(60);

export const ASSINATURA = "Maniçoba: quem já provou é mais feliz";

function mostrar(nivel: string, texto: string): void {
    console.log(LINHA);
    console.log(` [${nivel}] ${texto}`);
    console.log(LINHA);
}

export function sucesso(texto: string): void {
    mostrar("OK", texto);
}

export function aviso(texto: string): void {
    mostrar("AVISO", texto);
}

export function erro(texto: string): void {
    mostrar("ERRO", texto);
}