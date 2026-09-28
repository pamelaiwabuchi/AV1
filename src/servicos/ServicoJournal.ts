import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { CriptografiaArquivo } from "../persistencia/CriptografiaArquivo.js";
import { JournalTransacao } from "../entidades/JournalTransacao.js";

const ARQUIVO_ATUAL = "journal-atual.log";

export class ServicoJournal {
    private readonly pasta: string;
    private readonly chave: string;
    private readonly criptografia: CriptografiaArquivo;
    private readonly tamanhoMaximo: number;
    private usuarioAtual: string;
    private contador: number;

    constructor(pastaDados: string, chave: string, tamanhoMaximo: number = 10 * 1024 * 1024) {
        this.pasta = join(pastaDados, "journal");
        this.chave = chave;
        this.criptografia = new CriptografiaArquivo();
        this.tamanhoMaximo = tamanhoMaximo;
        this.usuarioAtual = "sistema";
        this.contador = 0;
    }

    definirUsuario(usuario: string): void {
        this.usuarioAtual = usuario;
    }

    registrar(operacao: string, entidade: string, dadosAntes: any, dadosDepois: any): JournalTransacao {
        this.contador = this.contador + 1;

        const transacao = new JournalTransacao(
            `TX-${Date.now()}-${this.contador}`,
            new Date(),
            operacao,
            entidade,
            dadosAntes,
            dadosDepois,
            this.usuarioAtual
        );

        transacao.registrar(this);

        return transacao;
    }

    gravar(transacao: JournalTransacao): void {
        mkdirSync(this.pasta, { recursive: true });

        const caminhoAtual = join(this.pasta, ARQUIVO_ATUAL);

        if (existsSync(caminhoAtual) && statSync(caminhoAtual).size >= this.tamanhoMaximo) {
            this.rotacionar();
        }

        const linha = this.criptografia.cifrar(JSON.stringify(transacao.paraDados()), this.chave);
        appendFileSync(caminhoAtual, linha + "\n", "utf8");
    }

    consultarPorPeriodo(dataInicio: Date, dataFim: Date): JournalTransacao[] {
        const fimDoDia = new Date(dataFim);
        fimDoDia.setHours(23, 59, 59, 999);

        return this.lerTodas().filter((t) => {
            const momento = t.getTimestamp().getTime();
            return momento >= dataInicio.getTime() && momento <= fimDoDia.getTime();
        });
    }

    listarArquivos(): string[] {
        if (!existsSync(this.pasta)) {
            return [];
        }

        return readdirSync(this.pasta).filter((nome) => nome.endsWith(".log")).sort();
    }

    private rotacionar(): void {
        const agora = new Date().toISOString().replaceAll(":", "-").replace(".", "-");

        let destino = join(this.pasta, `journal-${agora}.log`);
        let numero = 1;

        while (existsSync(destino)) {
            destino = join(this.pasta, `journal-${agora}-${numero}.log`);
            numero = numero + 1;
        }

        renameSync(join(this.pasta, ARQUIVO_ATUAL), destino);
    }

    private lerTodas(): JournalTransacao[] {
        const transacoes: JournalTransacao[] = [];

        for (const nome of this.listarArquivos()) {
            const linhas = readFileSync(join(this.pasta, nome), "utf8").split("\n");

            for (const linha of linhas) {
                if (linha.trim() === "") {
                    continue;
                }

                const texto = this.criptografia.decifrar(linha, this.chave);
                transacoes.push(JournalTransacao.deDados(JSON.parse(texto)));
            }
        }

        transacoes.sort((a, b) => a.getTimestamp().getTime() - b.getTimestamp().getTime());

        return transacoes;
    }
}