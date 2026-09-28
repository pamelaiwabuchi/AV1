import type { RepositorioArquivo } from "../persistencia/RepositorioArquivo.js";
import type { ServicoJournal } from "../servicos/ServicoJournal.js";

export class JournalTransacao {
    private id: string;
    private timestamp: Date;
    private operacao: string;
    private entidade: string;
    private dadosAntes: any;
    private dadosDepois: any;
    private usuarioResponsavel: string;

    constructor(id: string, timestamp: Date, operacao: string, entidade: string, dadosAntes: any, dadosDepois: any, usuarioResponsavel: string) {
        this.id = id;
        this.timestamp = timestamp;
        this.operacao = operacao;
        this.entidade = entidade;
        this.dadosAntes = dadosAntes;
        this.dadosDepois = dadosDepois;
        this.usuarioResponsavel = usuarioResponsavel;
    }

    registrar(journal: ServicoJournal): void {
        journal.gravar(this);
    }

    reverter(repositorio: RepositorioArquivo): boolean {
        if (!this.entidade.endsWith(".json")) {
            return false;
        }

        if (this.dadosAntes === null && this.dadosDepois !== null) {
            repositorio.excluirEntidade(this.entidade, this.dadosDepois.id);
            return true;
        }

        if (this.dadosAntes !== null) {
            repositorio.salvarEntidade(this.entidade, this.dadosAntes);
            return true;
        }

        return false;
    }

    paraDados(): any {
        return {
            id: this.id,
            timestamp: this.timestamp,
            operacao: this.operacao,
            entidade: this.entidade,
            dadosAntes: this.dadosAntes,
            dadosDepois: this.dadosDepois,
            usuarioResponsavel: this.usuarioResponsavel
        };
    }

    static deDados(dados: any): JournalTransacao {
        return new JournalTransacao(
            dados.id,
            new Date(dados.timestamp),
            dados.operacao,
            dados.entidade,
            dados.dadosAntes,
            dados.dadosDepois,
            dados.usuarioResponsavel
        );
    }

    getId(): string {
        return this.id;
    }

    getTimestamp(): Date {
        return this.timestamp;
    }

    getOperacao(): string {
        return this.operacao;
    }

    getEntidade(): string {
        return this.entidade;
    }

    getDadosAntes(): any {
        return this.dadosAntes;
    }

    getDadosDepois(): any {
        return this.dadosDepois;
    }

    getUsuarioResponsavel(): string {
        return this.usuarioResponsavel;
    }
}