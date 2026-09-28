import type { Interface } from "node:readline/promises";
import { ServicoJournal } from "../../servicos/ServicoJournal.js";
import { converterData, formatarData } from "../conversores.js";
import { dataValida, perguntarValido } from "../perguntas.js";
import { aviso } from "../mensagens.js";

export class TelaJournal {
    private journal: ServicoJournal;
    private terminal: Interface;

    constructor(journal: ServicoJournal, terminal: Interface) {
        this.journal = journal;
        this.terminal = terminal;
    }

    async consultarPorPeriodo(parametros: Record<string, string> = {}): Promise<void> {
        const textoInicio = await perguntarValido(this.terminal, "Data inicial (dd/mm/aaaa): ", dataValida, true, parametros["inicio"]);

        if (textoInicio === null) {
            aviso("Consulta cancelada.");
            return;
        }

        const dataInicio = converterData(textoInicio) as Date;

        const textoFim = await perguntarValido(this.terminal, "Data final (dd/mm/aaaa): ", (texto) => {
            const fim = converterData(texto);

            if (fim === null) {
                return "Data inválida. Use o formato dd/mm/aaaa.";
            }

            if (fim.getTime() < dataInicio.getTime()) {
                return "A data final precisa ser igual ou posterior à data inicial.";
            }

            return null;
        }, true, parametros["fim"]);

        if (textoFim === null) {
            aviso("Consulta cancelada.");
            return;
        }

        const dataFim = converterData(textoFim) as Date;
        const transacoes = this.journal.consultarPorPeriodo(dataInicio, dataFim);

        if (transacoes.length === 0) {
            aviso("Nenhuma transação encontrada no período.");
            return;
        }

        console.log(`Transações entre ${formatarData(dataInicio)} e ${formatarData(dataFim)}: ${transacoes.length}`);

        for (const t of transacoes) {
            const depois = t.getDadosDepois();
            const antes = t.getDadosAntes();
            let registro = "";

            if (depois !== null && depois.id !== undefined) {
                registro = ` [${depois.id}]`;
            } else if (antes !== null && antes.id !== undefined) {
                registro = ` [${antes.id}]`;
            }

            console.log(`  ${t.getTimestamp().toLocaleString("pt-BR")} | ${t.getUsuarioResponsavel()} | ${t.getOperacao()} | ${t.getEntidade()}${registro}`);
        }
    }
}