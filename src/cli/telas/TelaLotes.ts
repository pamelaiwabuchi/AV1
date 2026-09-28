import type { Interface } from "node:readline/promises";
import { ServicoLote } from "../../servicos/ServicoLote.js";
import { ServicoEquipamento } from "../../servicos/ServicoEquipamento.js";
import { Equipamento } from "../../entidades/Equipamento.js";
import { TipoEquipamento } from "../../enums/TipoEquipamento.js";
import { EstadoFisico } from "../../enums/EstadoFisico.js";
import { converterData, converterValor, formatarData } from "../conversores.js";

export class TelaLotes {
    private lote: ServicoLote;
    private equipamento: ServicoEquipamento;
    private terminal: Interface;

    constructor(lote: ServicoLote, equipamento: ServicoEquipamento, terminal: Interface) {
        this.lote = lote;
        this.equipamento = equipamento;
        this.terminal = terminal;
    }

    async registrar(): Promise<void> {
        const organizacaoId = await this.terminal.question("Código da organização (ex.: BR001): ");
        const notaFiscal = await this.terminal.question("Nota fiscal: ");
        const transportadora = await this.terminal.question("Transportadora: ");

        const dataEntrada = converterData(await this.terminal.question(`Data de entrada (dd/mm/aaaa, ex.: ${formatarData(new Date())}): `));

        if (dataEntrada === null) {
            console.log("Data de entrada inválida. Use o formato dd/mm/aaaa.");
            return;
        }

        const observacoes = await this.terminal.question("Observações (opcional, Enter para pular): ");

        try {
            const novo = this.lote.criarLote({
                organizacaoId,
                notaFiscal,
                transportadora,
                dataEntrada,
                observacoes
            });

            console.log(`Lote ${novo.getId()} registrado com status ${novo.getStatusProcessamento()}.`);
        } catch (erro) {
            console.log((erro as Error).message);
        }
    }

    async consultarPorPeriodo(): Promise<void> {
        const dataInicio = converterData(await this.terminal.question("Data inicial (dd/mm/aaaa): "));

        if (dataInicio === null) {
            console.log("Data inicial inválida. Use o formato dd/mm/aaaa.");
            return;
        }

        const dataFim = converterData(await this.terminal.question("Data final (dd/mm/aaaa): "));

        if (dataFim === null) {
            console.log("Data final inválida. Use o formato dd/mm/aaaa.");
            return;
        }

        try {
            const lotes = this.lote.consultarLotePorPeriodo(dataInicio, dataFim);

            if (lotes.length === 0) {
                console.log("Nenhum lote encontrado no período.");
                return;
            }

            console.log(`Lotes entre ${formatarData(dataInicio)} e ${formatarData(dataFim)}:`);

            for (const lote of lotes) {
                console.log(`  ${lote.getId()} - ${lote.getOrganizacaoId()} - NF ${lote.getNotaFiscal()} - ${lote.getTransportadora()} - entrada ${formatarData(lote.getDataEntrada())} - ${lote.getStatusProcessamento()}`);

                if (lote.getObservacoes() !== "") {
                    console.log(`      Observações: ${lote.getObservacoes()}`);
                }
            }
        } catch (erro) {
            console.log((erro as Error).message);
        }
    }

    async adicionarEquipamentos(responsavel: string): Promise<void> {
        const loteId = await this.terminal.question("Código do lote (ex.: LT001): ");

        try {
            this.lote.buscarLote(loteId);
        } catch (erro) {
            console.log((erro as Error).message);
            return;
        }

        while (true) {
            const tipo = (await this.escolherOpcao("Tipo do equipamento:", Object.values(TipoEquipamento))) as TipoEquipamento | null;

            if (tipo === null) {
                return;
            }

            const marca = await this.terminal.question("Marca: ");
            const modelo = await this.terminal.question("Modelo: ");
            const anoFabricacao = Number((await this.terminal.question("Ano de fabricação (ex.: 2019): ")).trim());
            const peso = converterValor(await this.terminal.question("Peso em kg (ex.: 2,5): "));

            if (peso === null) {
                console.log("Peso inválido. Use números, com vírgula para as casas decimais.");
                return;
            }

            const estadoDeclarado = (await this.escolherOpcao("Estado físico declarado:", Object.values(EstadoFisico))) as EstadoFisico | null;

            if (estadoDeclarado === null) {
                return;
            }

            try {
                const novo = this.lote.adicionarEquipamentoLote(loteId, {
                    tipo,
                    marca,
                    modelo,
                    anoFabricacao,
                    pesoQuilogramas: peso,
                    estadoFisico: estadoDeclarado
                }, responsavel);

                console.log(`Equipamento adicionado. Código de barras: ${novo.getCodigoBarrasInterno()} (posição ${novo.getPosicaoNoLote()} no lote).`);
            } catch (erro) {
                console.log((erro as Error).message);
                return;
            }

            const continuar = await this.terminal.question("Adicionar outro equipamento a este lote? (S/N): ");

            if (continuar.trim().toUpperCase() !== "S") {
                return;
            }
        }
    }

    async iniciarTriagem(responsavel: string): Promise<void> {
        const loteId = await this.terminal.question("Código do lote (ex.: LT001): ");

        try {
            this.lote.processarTriagem(loteId, responsavel);
            console.log(`Triagem do lote ${loteId.trim().toUpperCase()} iniciada.`);
        } catch (erro) {
            console.log((erro as Error).message);
        }
    }

    async avaliarEquipamento(responsavel: string): Promise<void> {
        const codigo = await this.terminal.question("Código de barras do equipamento (ex.: NOT-000001): ");

        let equipamento: Equipamento;

        try {
            equipamento = this.equipamento.buscarEquipamento(codigo);
        } catch (erro) {
            console.log((erro as Error).message);
            return;
        }

        console.log(`${equipamento.getCodigoBarrasInterno()} - ${equipamento.getTipo()} ${equipamento.getMarca()} ${equipamento.getModelo()}`);
        console.log(`Estado físico atual: ${equipamento.getEstadoFisico()} | Status: ${equipamento.getStatusRastreamento()}`);

        const novoEstado = (await this.escolherOpcao("Estado físico avaliado:", Object.values(EstadoFisico))) as EstadoFisico | null;

        if (novoEstado === null) {
            return;
        }

        let justificativa = "";
        const perdidas = Equipamento.categoriasPerdidas(equipamento.getEstadoFisico(), novoEstado);

        if (perdidas >= 2) {
            console.log(`O estado caiu ${perdidas} categorias. A justificativa é obrigatória.`);
            justificativa = await this.terminal.question("Justificativa: ");
        }

        try {
            const avaliado = this.lote.avaliarEquipamento(equipamento.getId(), novoEstado, justificativa, responsavel);
            console.log(`Equipamento avaliado como ${avaliado.getEstadoFisico()}. Status: ${avaliado.getStatusRastreamento()}.`);

            const lote = this.lote.buscarLote(avaliado.getLoteId());
            console.log(`Lote ${lote.getId()}: ${lote.getStatusProcessamento()}.`);
        } catch (erro) {
            console.log((erro as Error).message);
        }
    }

    async relatorioTriagem(): Promise<void> {
        const loteId = await this.terminal.question("Código do lote (ex.: LT001): ");

        try {
            console.log(this.lote.buscarLote(loteId).gerarRelatorioTriagem());
        } catch (erro) {
            console.log((erro as Error).message);
        }
    }

    private async escolherOpcao(titulo: string, opcoes: string[]): Promise<string | null> {
        console.log(titulo);

        opcoes.forEach((opcao, i) => {
            console.log(`  ${i + 1} - ${opcao}`);
        });

        const escolha = await this.terminal.question("Opção: ");
        const escolhida = opcoes[Number(escolha) - 1];

        if (escolhida === undefined) {
            console.log(`Opção inválida. Digite um número de 1 a ${opcoes.length}.`);
            return null;
        }

        return escolhida;
    }
}