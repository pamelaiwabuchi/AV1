import type { Interface } from "node:readline/promises";
import { ServicoLote } from "../../servicos/ServicoLote.js";
import { converterData, formatarData } from "../conversores.js";

export class TelaLotes {
    private lote: ServicoLote;
    private terminal: Interface;

    constructor(lote: ServicoLote, terminal: Interface) {
        this.lote = lote;
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
}