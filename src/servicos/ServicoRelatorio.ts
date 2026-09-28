import { ServicoOrganizacao } from "./ServicoOrganizacao.js";
import { ServicoLote } from "./ServicoLote.js";
import { ServicoEquipamento } from "./ServicoEquipamento.js";
import { ServicoParametros } from "./ServicoParametros.js";
import { StatusRastreamento } from "../enums/StatusRastreamento.js";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

export interface Periodo {
    inicio: Date;
    fim: Date;
}

export class ServicoRelatorio {
    private readonly organizacoes: ServicoOrganizacao;
    private readonly lotes: ServicoLote;
    private readonly equipamentos: ServicoEquipamento;
    private readonly parametros: ServicoParametros;

    constructor(organizacoes: ServicoOrganizacao, lotes: ServicoLote, equipamentos: ServicoEquipamento, parametros: ServicoParametros) {
        this.organizacoes = organizacoes;
        this.lotes = lotes;
        this.equipamentos = equipamentos;
        this.parametros = parametros;
    }

    gerarRelatorioPorOrganizacao(organizacaoId: string, periodo: Periodo): string {
        const organizacao = this.organizacoes.buscarOrganizacao(organizacaoId);
        const linhas: string[] = [];

        linhas.push(`Relatório por organização - ${organizacao.getId()} (${organizacao.getRazaoSocial()})`);
        linhas.push(`Período: ${this.data(periodo.inicio)} a ${this.data(periodo.fim)}`);
        linhas.push(`CNPJ: ${organizacao.getCnpj()} | Situação: ${organizacao.isAtivo() ? "ativa" : "desativada"}`);

        const contrato = organizacao.getContratoVigente();

        if (contrato === null) {
            linhas.push("Contrato atual: nenhum.");
        } else {
            linhas.push(
                `Contrato atual: ${contrato.getId()}, de ${this.data(contrato.getDataAssinatura())} a ${this.data(contrato.getDataVencimento())} ` +
                `(${contrato.estaVigente() ? "vigente" : "fora da vigência"}), ${this.dinheiro(contrato.getValorMensal())} por mês`
            );
        }

        const lotes = this.lotes.consultarLotePorPeriodo(periodo.inicio, periodo.fim).filter((l) => l.getOrganizacaoId() === organizacao.getId());

        let quantidadeEquipamentos = 0;
        let pesoTotal = 0;
        const porStatus: Record<string, number> = {};

        for (const lote of lotes) {
            for (const equipamento of this.equipamentos.listarPorLote(lote.getId())) {
                quantidadeEquipamentos = quantidadeEquipamentos + 1;
                pesoTotal = pesoTotal + equipamento.getPesoQuilogramas();

                const status = equipamento.getStatusRastreamento();
                porStatus[status] = (porStatus[status] ?? 0) + 1;
            }
        }

        linhas.push(`Lotes recebidos no período: ${lotes.length}`);
        linhas.push(`Equipamentos: ${quantidadeEquipamentos} | Peso total: ${this.peso(pesoTotal)}`);

        if (quantidadeEquipamentos > 0) {
            linhas.push("Equipamentos por status:");

            for (const status of Object.values(StatusRastreamento)) {
                const quantidade = porStatus[status];

                if (quantidade !== undefined) {
                    linhas.push(`  ${status}: ${quantidade}`);
                }
            }
        }

        return linhas.join("\n");
    }

    gerarRelatorioPorStatus(status: StatusRastreamento): string {
        const linhas: string[] = [];

        linhas.push(`Relatório por status - ${status}`);
        linhas.push(...this.montarSecaoDoStatus(status));

        return linhas.join("\n");
    }

    gerarRelatorioTodosOsStatus(): string {
        const linhas: string[] = [];

        linhas.push("Relatório por status - todos os status");

        for (const status of Object.values(StatusRastreamento)) {
            linhas.push("");
            linhas.push(`${status}`);
            linhas.push(...this.montarSecaoDoStatus(status));
        }

        return linhas.join("\n");
    }

    gerarRelatorioFinanceiro(periodo: Periodo): string {
        const aliquota = this.parametros.obterAliquota();
        const linhas: string[] = [];

        linhas.push("Relatório financeiro");
        linhas.push(`Período: ${this.data(periodo.inicio)} a ${this.data(periodo.fim)} (${this.diasEntre(periodo.inicio, periodo.fim)} dias) | Alíquota: ${aliquota.toLocaleString("pt-BR")}%`);
        linhas.push("Cálculo: valor mensal ÷ 30 × dias em que o contrato esteve vigente dentro do período.");

        let totalBruto = 0;

        for (const organizacao of this.organizacoes.listarOrganizacoes()) {
            const contratos = this.organizacoes.listarContratosDaOrganizacao(organizacao.getId());
            const linhasDaOrganizacao: string[] = [];
            let brutoDaOrganizacao = 0;

            for (const item of contratos) {
                const dias = this.diasEmComum(periodo.inicio, periodo.fim, item.contrato.getDataAssinatura(), item.fimEfetivo);

                if (dias === 0) {
                    continue;
                }

                const valor = item.contrato.getValorMensal() / 30 * dias;
                brutoDaOrganizacao = brutoDaOrganizacao + valor;

                linhasDaOrganizacao.push(
                    `  ${item.contrato.getId()}${item.atual ? " (atual)" : " (anterior)"}: ${this.dinheiro(item.contrato.getValorMensal())} por mês, ` +
                    `de ${this.data(item.contrato.getDataAssinatura())} a ${this.data(item.fimEfetivo)} ` +
                    `-> ${dias} dias no período -> ${this.dinheiro(valor)}`
                );
            }

            if (linhasDaOrganizacao.length === 0) {
                continue;
            }

            const impostos = brutoDaOrganizacao * aliquota / 100;

            linhas.push("");
            linhas.push(`${organizacao.getId()} - ${organizacao.getRazaoSocial()}`);
            linhas.push(...linhasDaOrganizacao);
            linhas.push(
                `  Receita bruta: ${this.dinheiro(brutoDaOrganizacao)} | Impostos: ${this.dinheiro(impostos)} | ` +
                `Receita líquida: ${this.dinheiro(brutoDaOrganizacao - impostos)}`
            );

            totalBruto = totalBruto + brutoDaOrganizacao;
        }

        if (totalBruto === 0) {
            linhas.push("");
            linhas.push("Nenhum contrato vigente no período.");
        }

        const totalImpostos = totalBruto * aliquota / 100;

        linhas.push("");
        linhas.push("TOTAL");
        linhas.push(
            `  Receita bruta: ${this.dinheiro(totalBruto)} | Impostos: ${this.dinheiro(totalImpostos)} | ` +
            `Receita líquida: ${this.dinheiro(totalBruto - totalImpostos)}`
        );

        return linhas.join("\n");
    }

    private montarSecaoDoStatus(status: StatusRastreamento): string[] {
        const equipamentos = this.equipamentos.listarPorStatus(status);
        const linhas: string[] = [];

        if (equipamentos.length === 0) {
            linhas.push("  Nenhum equipamento neste status.");
            return linhas;
        }

        let pesoTotal = 0;

        for (const equipamento of equipamentos) {
            pesoTotal = pesoTotal + equipamento.getPesoQuilogramas();
        }

        linhas.push(`  Equipamentos: ${equipamentos.length} | Peso total: ${this.peso(pesoTotal)}`);

        for (const equipamento of equipamentos) {
            const lote = this.lotes.buscarLote(equipamento.getLoteId());

            linhas.push(
                `    ${equipamento.getCodigoBarrasInterno()} - ${equipamento.getTipo()} ${equipamento.getMarca()} ${equipamento.getModelo()} ` +
                `- organização ${lote.getOrganizacaoId()} - lote ${lote.getId()}`
            );
        }

        return linhas;
    }

    private diasEmComum(inicioA: Date, fimA: Date, inicioB: Date, fimB: Date): number {
        const inicio = Math.max(inicioA.getTime(), inicioB.getTime());
        const fim = Math.min(fimA.getTime(), fimB.getTime());

        if (fim < inicio) {
            return 0;
        }

        return Math.round((fim - inicio) / UM_DIA_MS) + 1;
    }

    private diasEntre(inicio: Date, fim: Date): number {
        return Math.round((fim.getTime() - inicio.getTime()) / UM_DIA_MS) + 1;
    }

    private data(data: Date): string {
        return data.toLocaleDateString("pt-BR");
    }

    private dinheiro(valor: number): string {
        return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    private peso(valor: number): string {
        return `${valor.toLocaleString("pt-BR")} kg`;
    }
}