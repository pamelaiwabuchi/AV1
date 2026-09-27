import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { criptografar, descriptografar } from "./criptografia.js";
const PASTA_DADOS = "data";

// guarda dados no disco de forma protegida
export function salvar(nomeArquivo: string, dados: unknown, chave: string): void {
    mkdirSync(PASTA_DADOS, { recursive: true });

    const caminhoFinal = join(PASTA_DADOS, nomeArquivo);
    const caminhoTemporario = caminhoFinal + ".tmp";
    const texto = JSON.stringify(dados);
    const conteudoCriptografado = criptografar(texto, chave);
    writeFileSync(caminhoTemporario, conteudoCriptografado, "utf8");
    renameSync(caminhoTemporario, caminhoFinal);
}

export function ler<T>(nomeArquivo: string, chave: string): T | null {
    const caminho = join(PASTA_DADOS, nomeArquivo);

    if (!existsSync(caminho)) {
        return null;
    }

    const conteudoCriptografado = readFileSync(caminho, "utf8");
    const texto = descriptografar(conteudoCriptografado, chave);
    return JSON.parse(texto) as T;
}