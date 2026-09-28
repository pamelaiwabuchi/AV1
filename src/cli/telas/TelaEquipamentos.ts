import type { Interface } from "node:readline/promises";
import { ServicoLote } from "../../servicos/ServicoLote.js";
import { ServicoEquipamento } from "../../servicos/ServicoEquipamento.js";
import { ServicoParametros } from "../../servicos/ServicoParametros.js";
import { StatusRastreamento } from "../../enums/StatusRastreamento.js";
import { Equipamento } from "../../entidades/Equipamento.js";
import { formatarData } from "../conversores.js";
import { escolherOpcao, mensagemDeErro, mostrarComoCancelar, mostrarDisponiveis, naoVazio, perguntarValido } from "../perguntas.js";
import { sucesso, aviso, erro } from "../mensagens.js";

export class TelaEquipamentos {
    private lote: ServicoLote;
    private equipamento: ServicoEquipamento;
    private parametros: ServicoParametros;
    private terminal: Interface;

    constructor(lote: ServicoLote, equipamento: ServicoEquipamento, parametros: ServicoParametros, terminal: Interface) {
        this.lote = lote;
        this.equipamento = equipamento;
        this.parametros = parametros;
        this.terminal = terminal;
    }

    async movimentar(responsavel: string, parametros: Record<string, string> = {}): Promise<void> {
        mostrarComoCancelar();

        if (parametros["codigo"] === undefined) {
            const movimentaveis = this.equipamento.listarEquipamentos().filter((e) =>
                e.getStatusRastreamento() === StatusRastreamento.AGUARDANDO_DESMONTE ||
                e.getStatusRastreamento() === StatusRastreamento.EM_DESMONTE
            );
            mostrarDisponiveis("Equipamentos que podem ser movimentados", this.descreverEquipamentos(movimentaveis));
        }

        const codigo = await this.perguntarCodigo(parametros);

        if (codigo === null) {
            aviso("Movimentação cancelada.");
            return;
        }

        const equipamento = this.equipamento.buscarEquipamento(codigo);

        console.log(`${equipamento.getCodigoBarrasInterno()} - ${equipamento.getTipo()} ${equipamento.getMarca()} ${equipamento.getModelo()}`);
        console.log(`Status atual: ${equipamento.getStatusRastreamento()}`);

        const permitidos = this.equipamento.destinosPermitidos(equipamento.getStatusRastreamento());

        if (permitidos.length === 0) {
            aviso("Este equipamento não pode ser movimentado a partir do status atual.");
            return;
        }

        const novoStatus = (await escolherOpcao(this.terminal, "Para onde o equipamento vai?", permitidos)) as StatusRastreamento | null;

        if (novoStatus === null) {
            aviso("Movimentação cancelada.");
            return;
        }

        const justificativa = await perguntarValido(this.terminal, "Justificativa (obrigatória): ", naoVazio("A justificativa é obrigatória."), true);

        if (justificativa === null) {
            aviso("Movimentação cancelada.");
            return;
        }

        try {
            const movimentado = this.lote.movimentarEquipamento(equipamento.getId(), novoStatus, justificativa, responsavel);
            const lote = this.lote.buscarLote(movimentado.getLoteId());

            sucesso(
                `Equipamento ${movimentado.getCodigoBarrasInterno()} movido para ${movimentado.getStatusRastreamento()}. ` +
                `Lote ${lote.getId()}: ${lote.getStatusProcessamento()}.`
            );
        } catch (e) {
            erro((e as Error).message);
        }
    }

    async rastrear(parametros: Record<string, string> = {}): Promise<void> {
        if (parametros["codigo"] === undefined) {
            mostrarDisponiveis("Equipamentos", this.descreverEquipamentos(this.equipamento.listarEquipamentos()));
        }

        const codigo = await this.perguntarCodigo(parametros);

        if (codigo === null) {
            aviso("Consulta cancelada.");
            return;
        }

        const historico = this.equipamento.rastrearEquipamento(codigo);
        const equipamento = historico.equipamento;
        const lote = this.lote.buscarLote(equipamento.getLoteId());

        console.log(`Rastreabilidade - ${equipamento.getCodigoBarrasInterno()}`);
        console.log(`  ${equipamento.getTipo()} ${equipamento.getMarca()} ${equipamento.getModelo()} (${equipamento.getAnoFabricacao()}), ${equipamento.getPesoQuilogramas()} kg`);
        console.log(`  Organização: ${lote.getOrganizacaoId()} | Lote: ${lote.getId()} (NF ${lote.getNotaFiscal()}, entrada ${formatarData(lote.getDataEntrada())}) | Posição no lote: ${equipamento.getPosicaoNoLote()}`);
        console.log(`  Estado físico: ${equipamento.getEstadoFisico()} | Status: ${equipamento.getStatusRastreamento()}`);

        const coeficiente = this.parametros.obterCoeficiente(equipamento.getTipo());
        const depreciacao = equipamento.calcularDepreciacao(coeficiente);
        console.log(`  Depreciação: ${depreciacao.toLocaleString("pt-BR")}% (taxa de ${coeficiente.toLocaleString("pt-BR")}% ao ano)`);

        console.log("  Movimentações:");

        for (const movimentacao of historico.movimentacoes) {
            const origem = movimentacao.getOrigem() === "" ? "entrada" : movimentacao.getOrigem();
            console.log(`    ${movimentacao.getDataHora().toLocaleString("pt-BR")} | ${origem} -> ${movimentacao.getDestino()} | por ${movimentacao.getResponsavel()}`);

            if (movimentacao.getObservacao() !== "") {
                console.log(`        ${movimentacao.getObservacao()}`);
            }
        }
    }

    private descreverEquipamentos(equipamentos: Equipamento[]): string[] {
        return [...equipamentos].reverse().map((e) =>
            `${e.getCodigoBarrasInterno()} - ${e.getTipo()} ${e.getMarca()} ${e.getModelo()} - lote ${e.getLoteId()} - ${e.getStatusRastreamento()}`
        );
    }

    private async perguntarCodigo(parametros: Record<string, string>): Promise<string | null> {
        return perguntarValido(
            this.terminal,
            "Código de barras do equipamento (ex.: NOT-000001): ",
            (texto) => mensagemDeErro(() => this.equipamento.buscarEquipamento(texto)),
            true,
            parametros["codigo"]
        );
    }
}