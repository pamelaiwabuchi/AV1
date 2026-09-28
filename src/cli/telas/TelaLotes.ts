import type { Interface } from "node:readline/promises";
import { ServicoLote } from "../../servicos/ServicoLote.js";
import { ServicoEquipamento } from "../../servicos/ServicoEquipamento.js";
import { Equipamento } from "../../entidades/Equipamento.js";
import { StatusRastreamento } from "../../enums/StatusRastreamento.js";
import { TipoEquipamento } from "../../enums/TipoEquipamento.js";
import { EstadoFisico } from "../../enums/EstadoFisico.js";
import { converterData, converterValor, formatarData } from "../conversores.js";
import {
    dataValida,
    escolherOpcao,
    mensagemDeErro,
    mostrarComoCancelar,
    naoVazio,
    perguntarDataEntrada,
    perguntarSimOuNao,
    perguntarValido
} from "../perguntas.js";
import { sucesso, aviso, erro } from "../mensagens.js";

export class TelaLotes {
    private lote: ServicoLote;
    private equipamento: ServicoEquipamento;
    private terminal: Interface;

    constructor(lote: ServicoLote, equipamento: ServicoEquipamento, terminal: Interface) {
        this.lote = lote;
        this.equipamento = equipamento;
        this.terminal = terminal;
    }

    async registrar(parametros: Record<string, string> = {}): Promise<void> {
        mostrarComoCancelar();

        const organizacaoId = await perguntarValido(
            this.terminal,
            "Código da organização (ex.: BR001): ",
            (texto) => this.lote.verificarOrganizacao(texto),
            true,
            parametros["org"]
        );
        if (organizacaoId === null) {
            aviso("Registro de lote cancelado.");
            return;
        }

        const notaFiscal = await perguntarValido(
            this.terminal,
            "Nota fiscal: ",
            (texto) => this.lote.verificarNotaFiscal(organizacaoId, texto),
            true,
            parametros["nf"]
        );
        if (notaFiscal === null) {
            aviso("Registro de lote cancelado.");
            return;
        }

        const transportadora = await perguntarValido(
            this.terminal,
            "Transportadora: ",
            naoVazio("A transportadora é obrigatória."),
            true,
            parametros["transp"]
        );
        if (transportadora === null) {
            aviso("Registro de lote cancelado.");
            return;
        }

        const dataEntrada = await perguntarDataEntrada(this.terminal, parametros["data"]);
        if (dataEntrada === null) {
            aviso("Registro de lote cancelado.");
            return;
        }

        const observacoes = await perguntarValido(
            this.terminal,
            "Observações (opcional, Enter para pular): ",
            () => null,
            true,
            parametros["obs"]
        );
        if (observacoes === null) {
            aviso("Registro de lote cancelado.");
            return;
        }

        try {
            const novo = this.lote.criarLote({
                organizacaoId,
                notaFiscal,
                transportadora,
                dataEntrada,
                observacoes
            });

            sucesso(`Lote ${novo.getId()} registrado com status ${novo.getStatusProcessamento()}.`);
        } catch (e) {
            erro((e as Error).message);
        }
    }

    async consultarPorPeriodo(parametros: Record<string, string> = {}): Promise<void> {
        const periodo = await this.perguntarPeriodo(parametros);

        if (periodo === null) {
            aviso("Consulta cancelada.");
            return;
        }

        const lotes = this.lote.consultarLotePorPeriodo(periodo.inicio, periodo.fim);

        if (lotes.length === 0) {
            aviso("Nenhum lote encontrado no período.");
            return;
        }

        console.log(`Lotes entre ${formatarData(periodo.inicio)} e ${formatarData(periodo.fim)}:`);

        for (const lote of lotes) {
            console.log(`  ${lote.getId()} - ${lote.getOrganizacaoId()} - NF ${lote.getNotaFiscal()} - ${lote.getTransportadora()} - entrada ${formatarData(lote.getDataEntrada())} - ${lote.getStatusProcessamento()}`);

            if (lote.getObservacoes() !== "") {
                console.log(`      Observações: ${lote.getObservacoes()}`);
            }
        }
    }

    async adicionarEquipamentos(responsavel: string, parametros: Record<string, string> = {}): Promise<void> {
        mostrarComoCancelar();

        const loteId = await perguntarValido(
            this.terminal,
            "Código do lote (ex.: LT001): ",
            (texto) => this.lote.verificarLoteAceitaEquipamentos(texto),
            true,
            parametros["lote"]
        );
        if (loteId === null) {
            aviso("Cadastro de equipamento cancelado.");
            return;
        }

        const anoAtual = new Date().getFullYear();

        while (true) {
            const tipo = (await escolherOpcao(this.terminal, "Tipo do equipamento", Object.values(TipoEquipamento))) as TipoEquipamento | null;
            if (tipo === null) {
                aviso("Cadastro de equipamento cancelado.");
                return;
            }

            const marca = await perguntarValido(this.terminal, "Marca: ", naoVazio("A marca é obrigatória."), true);
            if (marca === null) {
                aviso("Cadastro de equipamento cancelado.");
                return;
            }

            const modelo = await perguntarValido(this.terminal, "Modelo: ", naoVazio("O modelo é obrigatório."), true);
            if (modelo === null) {
                aviso("Cadastro de equipamento cancelado.");
                return;
            }

            const textoAno = await perguntarValido(this.terminal, "Ano de fabricação (ex.: 2019): ", (texto) => {
                const ano = Number(texto);

                if (!Number.isInteger(ano) || texto === "" || ano > anoAtual) {
                    return `O ano precisa ser um número inteiro e não pode ser maior que ${anoAtual}.`;
                }

                return null;
            }, true);
            if (textoAno === null) {
                aviso("Cadastro de equipamento cancelado.");
                return;
            }

            const textoPeso = await perguntarValido(this.terminal, "Peso em kg (ex.: 2,5): ", (texto) => {
                const peso = converterValor(texto);

                if (peso === null || peso <= 0) {
                    return "O peso precisa ser um número maior que zero, com vírgula para as casas decimais.";
                }

                return null;
            }, true);
            if (textoPeso === null) {
                aviso("Cadastro de equipamento cancelado.");
                return;
            }

            const estadoDeclarado = (await escolherOpcao(this.terminal, "Estado físico declarado", Object.values(EstadoFisico))) as EstadoFisico | null;
            if (estadoDeclarado === null) {
                aviso("Cadastro de equipamento cancelado.");
                return;
            }

            try {
                const novo = this.lote.adicionarEquipamentoLote(loteId, {
                    tipo,
                    marca,
                    modelo,
                    anoFabricacao: Number(textoAno),
                    pesoQuilogramas: converterValor(textoPeso) as number,
                    estadoFisico: estadoDeclarado
                }, responsavel);

                sucesso(`Equipamento adicionado. Código de barras: ${novo.getCodigoBarrasInterno()} (posição ${novo.getPosicaoNoLote()} no lote).`);
            } catch (e) {
                erro((e as Error).message);
                return;
            }

            const continuar = await perguntarSimOuNao(this.terminal, "Adicionar outro equipamento a este lote? (S/N): ");

            if (continuar !== true) {
                return;
            }
        }
    }

    async iniciarTriagem(responsavel: string, parametros: Record<string, string> = {}): Promise<void> {
        const loteId = await perguntarValido(
            this.terminal,
            "Código do lote (ex.: LT001): ",
            (texto) => mensagemDeErro(() => this.lote.buscarLote(texto)),
            true,
            parametros["lote"]
        );

        if (loteId === null) {
            aviso("Início da triagem cancelado.");
            return;
        }

        try {
            this.lote.processarTriagem(loteId, responsavel);
            sucesso(`Triagem do lote ${loteId.toUpperCase()} iniciada.`);
        } catch (e) {
            erro((e as Error).message);
        }
    }

    async avaliarEquipamento(responsavel: string, parametros: Record<string, string> = {}): Promise<void> {
        mostrarComoCancelar();

        const codigo = await perguntarValido(
            this.terminal,
            "Código de barras do equipamento (ex.: NOT-000001): ",
            (texto) => {
                const problema = mensagemDeErro(() => this.equipamento.buscarEquipamento(texto));

                if (problema !== null) {
                    return problema;
                }

                const status = this.equipamento.buscarEquipamento(texto).getStatusRastreamento();

                if (status !== StatusRastreamento.EM_TRIAGEM) {
                    return `Este equipamento não está em triagem (status: ${status}).`;
                }

                return null;
            },
            true,
            parametros["codigo"]
        );

        if (codigo === null) {
            aviso("Avaliação cancelada.");
            return;
        }

        const equipamento = this.equipamento.buscarEquipamento(codigo);

        console.log(`${equipamento.getCodigoBarrasInterno()} - ${equipamento.getTipo()} ${equipamento.getMarca()} ${equipamento.getModelo()}`);
        console.log(`Estado físico atual: ${equipamento.getEstadoFisico()} | Status: ${equipamento.getStatusRastreamento()}`);

        const novoEstado = (await escolherOpcao(this.terminal, "Estado físico avaliado", Object.values(EstadoFisico))) as EstadoFisico | null;

        if (novoEstado === null) {
            aviso("Avaliação cancelada.");
            return;
        }

        let justificativa = "";
        const perdidas = Equipamento.categoriasPerdidas(equipamento.getEstadoFisico(), novoEstado);

        if (perdidas >= 2) {
            console.log(`O estado caiu ${perdidas} categorias. A justificativa é obrigatória.`);

            const texto = await perguntarValido(this.terminal, "Justificativa: ", naoVazio("A justificativa é obrigatória."), true);

            if (texto === null) {
                aviso("Avaliação cancelada.");
                return;
            }

            justificativa = texto;
        }

        try {
            const avaliado = this.lote.avaliarEquipamento(equipamento.getId(), novoEstado, justificativa, responsavel);
            const lote = this.lote.buscarLote(avaliado.getLoteId());

            sucesso(
                `Equipamento avaliado como ${avaliado.getEstadoFisico()}. Status: ${avaliado.getStatusRastreamento()}. ` +
                `Lote ${lote.getId()}: ${lote.getStatusProcessamento()}.`
            );
        } catch (e) {
            erro((e as Error).message);
        }
    }

    async relatorioTriagem(parametros: Record<string, string> = {}): Promise<void> {
        const loteId = await perguntarValido(
            this.terminal,
            "Código do lote (ex.: LT001): ",
            (texto) => mensagemDeErro(() => this.lote.buscarLote(texto)),
            true,
            parametros["lote"]
        );

        if (loteId === null) {
            aviso("Relatório cancelado.");
            return;
        }

        console.log(this.lote.buscarLote(loteId).gerarRelatorioTriagem());
    }

    private async perguntarPeriodo(parametros: Record<string, string>): Promise<{ inicio: Date; fim: Date } | null> {
        const textoInicio = await perguntarValido(this.terminal, "Data inicial (dd/mm/aaaa): ", dataValida, true, parametros["inicio"]);

        if (textoInicio === null) {
            return null;
        }

        const inicio = converterData(textoInicio) as Date;

        const textoFim = await perguntarValido(this.terminal, "Data final (dd/mm/aaaa): ", (texto) => {
            const fim = converterData(texto);

            if (fim === null) {
                return "Data inválida. Use o formato dd/mm/aaaa.";
            }

            if (fim.getTime() < inicio.getTime()) {
                return "A data final precisa ser igual ou posterior à data inicial.";
            }

            return null;
        }, true, parametros["fim"]);

        if (textoFim === null) {
            return null;
        }

        return { inicio: inicio, fim: converterData(textoFim) as Date };
    }
}