import { StatusLote } from "../enums/StatusLote.js";

export class Lote {
    private id: string;
    private dataEntrada: Date;
    private organizacaoId: string;
    private notaFiscal: string;
    private transportadora: string;
    private statusProcessamento: StatusLote;
    private observacoes: string;

    constructor(
        id: string,
        dataEntrada: Date,
        organizacaoId: string,
        notaFiscal: string,
        transportadora: string,
        statusProcessamento: StatusLote,
        observacoes: string
    ) {
        this.id = id;
        this.dataEntrada = dataEntrada;
        this.organizacaoId = organizacaoId;
        this.notaFiscal = notaFiscal;
        this.transportadora = transportadora;
        this.statusProcessamento = statusProcessamento;
        this.observacoes = observacoes;
    }

    paraDados(): any {
        return {
            id: this.id,
            dataEntrada: this.dataEntrada,
            organizacaoId: this.organizacaoId,
            notaFiscal: this.notaFiscal,
            transportadora: this.transportadora,
            statusProcessamento: this.statusProcessamento,
            observacoes: this.observacoes
        };
    }

    static deDados(dados: any): Lote {
        return new Lote(
            dados.id,
            new Date(dados.dataEntrada),
            dados.organizacaoId,
            dados.notaFiscal,
            dados.transportadora,
            dados.statusProcessamento,
            dados.observacoes
        );
    }

    getId(): string {
        return this.id;
    }

    getDataEntrada(): Date {
        return this.dataEntrada;
    }

    getOrganizacaoId(): string {
        return this.organizacaoId;
    }

    getNotaFiscal(): string {
        return this.notaFiscal;
    }

    getTransportadora(): string {
        return this.transportadora;
    }

    getStatusProcessamento(): StatusLote {
        return this.statusProcessamento;
    }

    getObservacoes(): string {
        return this.observacoes;
    }
}