import { Movimentacao } from "./Movimentacao.js";
import { TipoEquipamento } from "../enums/TipoEquipamento.js";
import { EstadoFisico } from "../enums/EstadoFisico.js";
import { StatusRastreamento } from "../enums/StatusRastreamento.js";

export class Equipamento {
    private id: string;
    private codigoBarrasInterno: string;
    private tipo: TipoEquipamento;
    private marca: string;
    private modelo: string;
    private anoFabricacao: number;
    private estadoFisico: EstadoFisico;
    private pesoQuilogramas: number;
    private loteId: string;
    private posicaoNoLote: number;
    private statusRastreamento: StatusRastreamento;
    private historicoMovimentacao: Movimentacao[];

    constructor(
        id: string,
        codigoBarrasInterno: string,
        tipo: TipoEquipamento,
        marca: string,
        modelo: string,
        anoFabricacao: number,
        estadoFisico: EstadoFisico,
        pesoQuilogramas: number,
        loteId: string,
        posicaoNoLote: number,
        statusRastreamento: StatusRastreamento,
        historicoMovimentacao: Movimentacao[]
    ) {
        this.id = id;
        this.codigoBarrasInterno = codigoBarrasInterno;
        this.tipo = tipo;
        this.marca = marca;
        this.modelo = modelo;
        this.anoFabricacao = anoFabricacao;
        this.estadoFisico = estadoFisico;
        this.pesoQuilogramas = pesoQuilogramas;
        this.loteId = loteId;
        this.posicaoNoLote = posicaoNoLote;
        this.statusRastreamento = statusRastreamento;
        this.historicoMovimentacao = historicoMovimentacao;
    }

    atualizarStatus(novoStatus: StatusRastreamento, justificativa: string, responsavel: string): void {
        if (novoStatus === StatusRastreamento.EM_DESMONTE && this.statusRastreamento !== StatusRastreamento.AGUARDANDO_DESMONTE) {
            throw new Error(`O equipamento ${this.codigoBarrasInterno} só pode ir para desmonte depois de passar pela triagem completa.`);
        }

        const statusAnterior = this.statusRastreamento;
        this.statusRastreamento = novoStatus;
        this.registrarMovimentacao(novoStatus, responsavel, statusAnterior, justificativa);
    }

    static categoriasPerdidas(estadoAtual: EstadoFisico, novoEstado: EstadoFisico): number {
        const estados = Object.values(EstadoFisico);
        return estados.indexOf(novoEstado) - estados.indexOf(estadoAtual);
    }

    avaliarEstadoFisico(novoEstado: EstadoFisico, justificativa: string, responsavel: string): void {
        const categoriasPerdidas = Equipamento.categoriasPerdidas(this.estadoFisico, novoEstado);

        if (categoriasPerdidas >= 2 && justificativa.trim() === "") {
            throw new Error(
                `O estado caiu ${categoriasPerdidas} categorias (de ${this.estadoFisico} para ${novoEstado}). ` +
                `A justificativa é obrigatória.`
            );
        }

        const estadoAnterior = this.estadoFisico;
        this.estadoFisico = novoEstado;

        let observacao = `Estado físico: ${estadoAnterior} -> ${novoEstado}`;

        if (justificativa.trim() !== "") {
            observacao = observacao + `. Justificativa: ${justificativa.trim()}`;
        }

        this.registrarMovimentacao(this.statusRastreamento, responsavel, this.statusRastreamento, observacao);
    }

    registrarMovimentacao(destino: string, responsavel: string, origem: string = "", observacao: string = ""): void {
        const movimentacao = new Movimentacao(
            `${this.id}-${this.historicoMovimentacao.length + 1}`,
            this.id,
            new Date(),
            origem,
            destino,
            responsavel,
            observacao
        );

        this.historicoMovimentacao.push(movimentacao);
    }

    paraDados(): any {
        return {
            id: this.id,
            codigoBarrasInterno: this.codigoBarrasInterno,
            tipo: this.tipo,
            marca: this.marca,
            modelo: this.modelo,
            anoFabricacao: this.anoFabricacao,
            estadoFisico: this.estadoFisico,
            pesoQuilogramas: this.pesoQuilogramas,
            loteId: this.loteId,
            posicaoNoLote: this.posicaoNoLote,
            statusRastreamento: this.statusRastreamento,
            historicoMovimentacao: this.historicoMovimentacao.map((m) => m.paraDados())
        };
    }

    static deDados(dados: any): Equipamento {
        return new Equipamento(
            dados.id,
            dados.codigoBarrasInterno,
            dados.tipo,
            dados.marca,
            dados.modelo,
            dados.anoFabricacao,
            dados.estadoFisico,
            dados.pesoQuilogramas,
            dados.loteId,
            dados.posicaoNoLote,
            dados.statusRastreamento,
            dados.historicoMovimentacao.map((m: any) => Movimentacao.deDados(m))
        );
    }

    getId(): string {
        return this.id;
    }

    getCodigoBarrasInterno(): string {
        return this.codigoBarrasInterno;
    }

    getTipo(): TipoEquipamento {
        return this.tipo;
    }

    getMarca(): string {
        return this.marca;
    }

    getModelo(): string {
        return this.modelo;
    }

    getAnoFabricacao(): number {
        return this.anoFabricacao;
    }

    getEstadoFisico(): EstadoFisico {
        return this.estadoFisico;
    }

    getPesoQuilogramas(): number {
        return this.pesoQuilogramas;
    }

    getLoteId(): string {
        return this.loteId;
    }

    getPosicaoNoLote(): number {
        return this.posicaoNoLote;
    }

    getStatusRastreamento(): StatusRastreamento {
        return this.statusRastreamento;
    }

    getHistoricoMovimentacao(): Movimentacao[] {
        return this.historicoMovimentacao;
    }
}