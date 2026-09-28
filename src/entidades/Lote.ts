import { Equipamento } from "./Equipamento.js";
import { StatusLote } from "../enums/StatusLote.js";
import { StatusRastreamento } from "../enums/StatusRastreamento.js";

export class Lote {
    private id: string;
    private dataEntrada: Date;
    private organizacaoId: string;
    private notaFiscal: string;
    private transportadora: string;
    private equipamentos: Equipamento[];
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
        this.equipamentos = [];
        this.statusProcessamento = statusProcessamento;
        this.observacoes = observacoes;
    }

    adicionarEquipamento(equip: Equipamento): void {
        this.equipamentos.push(equip);
    }

    removerEquipamento(equipId: string): boolean {
        const quantidadeAntes = this.equipamentos.length;
        this.equipamentos = this.equipamentos.filter((e) => e.getId() !== equipId);
        return this.equipamentos.length < quantidadeAntes;
    }

    calcularPesoTotal(): number {
        let total = 0;

        for (const equipamento of this.equipamentos) {
            total = total + equipamento.getPesoQuilogramas();
        }

        return total;
    }

    gerarRelatorioTriagem(): string {
        const linhas: string[] = [];

        linhas.push(`Relatório de triagem - Lote ${this.id}`);
        linhas.push(`Organização: ${this.organizacaoId} | NF: ${this.notaFiscal} | Status do lote: ${this.statusProcessamento}`);
        linhas.push(`Equipamentos: ${this.equipamentos.length} | Peso total: ${this.calcularPesoTotal().toFixed(2)} kg`);

        const triados = this.equipamentos.filter((e) => e.getStatusRastreamento() !== StatusRastreamento.AGUARDANDO_TRIAGEM && e.getStatusRastreamento() !== StatusRastreamento.EM_TRIAGEM);
        linhas.push(`Triados: ${triados.length} de ${this.equipamentos.length}`);

        for (const equipamento of this.equipamentos) {
            linhas.push(
                `  ${equipamento.getPosicaoNoLote()}. ${equipamento.getCodigoBarrasInterno()} - ${equipamento.getTipo()} ` +
                `${equipamento.getMarca()} ${equipamento.getModelo()} - ${equipamento.getEstadoFisico()} - ${equipamento.getStatusRastreamento()}`
            );
        }

        return linhas.join("\n");
    }

    alterarStatus(novoStatus: StatusLote): void {
        this.statusProcessamento = novoStatus;
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

    getEquipamentos(): Equipamento[] {
        return this.equipamentos;
    }

    getStatusProcessamento(): StatusLote {
        return this.statusProcessamento;
    }

    getObservacoes(): string {
        return this.observacoes;
    }
}