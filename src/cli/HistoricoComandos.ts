import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Interface } from "node:readline/promises";
import { CriptografiaArquivo } from "../persistencia/CriptografiaArquivo.js";

const LIMITE_COMANDOS = 200;

export class HistoricoComandos {
    private readonly linhas: string[];
    private readonly comandos: string[];
    private readonly caminho: string;
    private readonly pasta: string;
    private readonly criptografia: CriptografiaArquivo;
    private chave: string | null;

    constructor(pastaDados: string) {
        this.linhas = [];
        this.comandos = [];
        this.pasta = pastaDados;
        this.caminho = join(pastaDados, "historico.enc");
        this.criptografia = new CriptografiaArquivo();
        this.chave = null;
    }

    getLinhas(): string[] {
        return this.linhas;
    }

    carregar(chave: string): void {
        this.chave = chave;

        if (existsSync(this.caminho)) {
            const texto = this.criptografia.decifrar(readFileSync(this.caminho, "utf8"), chave);
            const salvos: string[] = JSON.parse(texto);
            this.comandos.push(...salvos);
        }

        this.linhas.length = 0;
        this.linhas.push(...this.comandos);
    }

    registrarComando(entrada: string): void {
        const anteriores = this.comandos.filter((c) => c !== entrada);

        this.comandos.length = 0;
        this.comandos.push(entrada, ...anteriores.slice(0, LIMITE_COMANDOS - 1));

        this.salvar();
    }

    esquecerRespostas(): void {
        this.linhas.length = 0;
        this.linhas.push(...this.comandos);
    }

    async perguntarSenha(terminal: Interface, pergunta: string): Promise<string> {
        const senha = await terminal.question(pergunta);

        if (this.linhas[0] === senha) {
            this.linhas.shift();
        }

        return senha;
    }

    private salvar(): void {
        if (this.chave === null) {
            return;
        }

        const conteudo = this.criptografia.cifrar(JSON.stringify(this.comandos), this.chave);
        const temporario = this.caminho + ".tmp";

        mkdirSync(this.pasta, { recursive: true });
        writeFileSync(temporario, conteudo, "utf8");
        renameSync(temporario, this.caminho);
    }
}