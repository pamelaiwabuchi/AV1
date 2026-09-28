export class Movimentacao {
    private id: string;
    private equipamentoId: string;
    private dataHora: Date;
    private origem: string;
    private destino: string;
    private responsavel: string;
    private observacao: string;

    constructor(id: string, equipamentoId: string, dataHora: Date, origem: string, destino: string, responsavel: string, observacao: string) {
        this.id = id;
        this.equipamentoId = equipamentoId;
        this.dataHora = dataHora;
        this.origem = origem;
        this.destino = destino;
        this.responsavel = responsavel;
        this.observacao = observacao;
    }

    paraDados(): any {
        return {
            id: this.id,
            equipamentoId: this.equipamentoId,
            dataHora: this.dataHora,
            origem: this.origem,
            destino: this.destino,
            responsavel: this.responsavel,
            observacao: this.observacao
        };
    }

    static deDados(dados: any): Movimentacao {
        return new Movimentacao(
            dados.id,
            dados.equipamentoId,
            new Date(dados.dataHora),
            dados.origem,
            dados.destino,
            dados.responsavel,
            dados.observacao
        );
    }

    getId(): string {
        return this.id;
    }

    getDataHora(): Date {
        return this.dataHora;
    }

    getOrigem(): string {
        return this.origem;
    }

    getDestino(): string {
        return this.destino;
    }

    getResponsavel(): string {
        return this.responsavel;
    }

    getObservacao(): string {
        return this.observacao;
    }
}