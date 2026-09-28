export class Contrato {
    private id: string;
    private organizacaoId: string;
    private dataAssinatura: Date;
    private dataVencimento: Date;
    private clausulas: string[];
    private valorMensal: number;
    private renovacaoAutomatica: boolean;

    constructor(id: string, organizacaoId: string, dataAssinatura: Date, dataVencimento: Date, clausulas: string[], valorMensal: number, renovacaoAutomatica: boolean) {
        this.id = id;
        this.organizacaoId = organizacaoId;
        this.dataAssinatura = dataAssinatura;
        this.dataVencimento = dataVencimento;
        this.clausulas = clausulas;
        this.valorMensal = valorMensal;
        this.renovacaoAutomatica = renovacaoAutomatica;
    }

    estaVigente(): boolean {
        const agora = Date.now();
        return agora >= this.dataAssinatura.getTime() && agora <= this.dataVencimento.getTime();
    }

    renovar(novoVencimento: Date): void {
        if (novoVencimento.getTime() <= this.dataVencimento.getTime()) {
            throw new Error("O novo vencimento precisa ser depois do vencimento atual.");
        }

        this.dataVencimento = novoVencimento;
    }

    paraDados(): any {
        return {
            id: this.id,
            organizacaoId: this.organizacaoId,
            dataAssinatura: this.dataAssinatura,
            dataVencimento: this.dataVencimento,
            clausulas: this.clausulas,
            valorMensal: this.valorMensal,
            renovacaoAutomatica: this.renovacaoAutomatica
        };
    }

    static deDados(dados: any): Contrato {
        return new Contrato(
            dados.id,
            dados.organizacaoId,
            new Date(dados.dataAssinatura),
            new Date(dados.dataVencimento),
            dados.clausulas,
            dados.valorMensal,
            dados.renovacaoAutomatica
        );
    }

    getId(): string {
        return this.id;
    }

    getDataAssinatura(): Date {
        return this.dataAssinatura;
    }

    getDataVencimento(): Date {
        return this.dataVencimento;
    }

    getClausulas(): string[] {
        return this.clausulas;
    }

    getValorMensal(): number {
        return this.valorMensal;
    }

    isRenovacaoAutomatica(): boolean {
        return this.renovacaoAutomatica;
    }
}