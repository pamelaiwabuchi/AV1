import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { CriptografiaArquivo } from "./CriptografiaArquivo.js";

export class RepositorioArquivo {
    private readonly diretorioBase: string;
    private readonly criptografia: CriptografiaArquivo;
    private readonly chave: string;

    constructor(diretorioBase: string, chave: string) {
        this.diretorioBase = diretorioBase;
        this.criptografia = new CriptografiaArquivo();
        this.chave = chave;
    }

    salvarEntidade(nomeArquivo: string, entidade: any): void {
        const lista = this.lerArquivo(nomeArquivo);
        const posicao = lista.findIndex((item) => item.id === entidade.id);

        if (posicao === -1) {
            lista.push(entidade);
        } else {
            lista[posicao] = entidade;
        }

        this.gravarArquivo(nomeArquivo, lista);
    }

    carregarEntidade(nomeArquivo: string, id: string): any {
        const lista = this.lerArquivo(nomeArquivo);
        const encontrada = lista.find((item) => item.id === id);

        if (encontrada === undefined) {
            return null;
        }

        return encontrada;
    }

    listarEntidades(nomeArquivo: string): any[] {
        return this.lerArquivo(nomeArquivo);
    }

    excluirEntidade(nomeArquivo: string, id: string): void {
        const lista = this.lerArquivo(nomeArquivo);
        const restantes = lista.filter((item) => item.id !== id);
        this.gravarArquivo(nomeArquivo, restantes);
    }

    private lerArquivo(nomeArquivo: string): any[] {
        const caminho = join(this.diretorioBase, nomeArquivo);

        if (!existsSync(caminho)) {
            return [];
        }

        const conteudo = readFileSync(caminho, "utf8");
        const texto = this.criptografia.decifrar(conteudo, this.chave);
        return JSON.parse(texto);
    }

    private gravarArquivo(nomeArquivo: string, lista: any[]): void {
        mkdirSync(this.diretorioBase, { recursive: true });

        const caminhoFinal = join(this.diretorioBase, nomeArquivo);
        const caminhoTemporario = caminhoFinal + ".tmp";

        const texto = JSON.stringify(lista);
        const conteudo = this.criptografia.cifrar(texto, this.chave);

        writeFileSync(caminhoTemporario, conteudo, "utf8");
        renameSync(caminhoTemporario, caminhoFinal);
    }
}