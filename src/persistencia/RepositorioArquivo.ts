import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { CriptografiaArquivo } from "./CriptografiaArquivo.js";
import type { ServicoJournal } from "../servicos/ServicoJournal.js";

export class RepositorioArquivo {
    private readonly diretorioBase: string;
    private readonly criptografia: CriptografiaArquivo;
    private readonly chave: string;
    private readonly journal: ServicoJournal | null;

    constructor(diretorioBase: string, chave: string, journal: ServicoJournal | null = null) {
        this.diretorioBase = diretorioBase;
        this.criptografia = new CriptografiaArquivo();
        this.chave = chave;
        this.journal = journal;
    }

    salvarEntidade(nomeArquivo: string, entidade: any): void {
        const lista = this.lerArquivo(nomeArquivo);
        const posicao = lista.findIndex((item) => item.id === entidade.id);

        if (this.journal !== null) {
            const dadosAntes = posicao === -1 ? null : lista[posicao];
            const operacao = posicao === -1 ? "CRIAR" : "ALTERAR";
            this.journal.registrar(operacao, nomeArquivo, dadosAntes, entidade);
        }

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
        const excluida = lista.find((item) => item.id === id);

        if (this.journal !== null && excluida !== undefined) {
            this.journal.registrar("EXCLUIR", nomeArquivo, excluida, null);
        }

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