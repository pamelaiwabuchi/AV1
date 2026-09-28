import type { Interface } from "node:readline/promises";
import { ServicoParametros } from "../../servicos/ServicoParametros.js";
import { ServicoJournal } from "../../servicos/ServicoJournal.js";
import { ServicoAutenticacao } from "../../servicos/ServicoAutenticacao.js";
import { HistoricoComandos } from "../HistoricoComandos.js";
import { TipoEquipamento } from "../../enums/TipoEquipamento.js";
import { converterValor } from "../conversores.js";
import { escolherOpcao, perguntarValido } from "../perguntas.js";
import { sucesso, aviso, erro } from "../mensagens.js";

export class TelaParametros {
    private parametros: ServicoParametros;
    private journal: ServicoJournal;
    private autenticacao: ServicoAutenticacao;
    private historico: HistoricoComandos;
    private terminal: Interface;

    constructor(
        parametros: ServicoParametros,
        journal: ServicoJournal,
        autenticacao: ServicoAutenticacao,
        historico: HistoricoComandos,
        terminal: Interface
    ) {
        this.parametros = parametros;
        this.journal = journal;
        this.autenticacao = autenticacao;
        this.historico = historico;
        this.terminal = terminal;
    }

    consultar(): void {
        console.log("Parâmetros globais:");
        console.log(`  Alíquota de impostos: ${this.formatarPercentual(this.parametros.obterAliquota())}`);
        console.log("  Coeficientes de depreciação (ao ano):");

        const coeficientes = this.parametros.listarCoeficientes();

        for (const tipo of Object.values(TipoEquipamento)) {
            console.log(`    ${tipo}: ${this.formatarPercentual(coeficientes[tipo])}`);
        }
    }

    async alterarAliquota(): Promise<void> {
        console.log(`Alíquota atual: ${this.formatarPercentual(this.parametros.obterAliquota())}`);

        const texto = await perguntarValido(
            this.terminal,
            "Nova alíquota em % (ex.: 15 ou 15,5; \"sair\" para voltar): ",
            (valor) => this.problemaPercentual(valor, "A alíquota"),
            false
        );

        if (texto === null) {
            aviso("Alteração cancelada.");
            return;
        }

        try {
            const novaAliquota = converterValor(texto) as number;
            this.parametros.alterarAliquota(novaAliquota);
            sucesso(`Alíquota alterada para ${this.formatarPercentual(novaAliquota)}.`);
        } catch (e) {
            erro((e as Error).message);
        }
    }

    async alterarCoeficiente(): Promise<void> {
        const tipo = (await escolherOpcao(this.terminal, "Tipo de equipamento", Object.values(TipoEquipamento))) as TipoEquipamento | null;

        if (tipo === null) {
            aviso("Alteração cancelada.");
            return;
        }

        console.log(`Coeficiente atual de ${tipo}: ${this.formatarPercentual(this.parametros.obterCoeficiente(tipo))} ao ano`);

        const texto = await perguntarValido(
            this.terminal,
            "Novo coeficiente em % ao ano (ex.: 20; \"sair\" para voltar): ",
            (valor) => this.problemaPercentual(valor, "O coeficiente"),
            false
        );

        if (texto === null) {
            aviso("Alteração cancelada.");
            return;
        }

        try {
            const novoCoeficiente = converterValor(texto) as number;
            this.parametros.alterarCoeficiente(tipo, novoCoeficiente);
            sucesso(`Coeficiente de ${tipo} alterado para ${this.formatarPercentual(novoCoeficiente)} ao ano.`);
        } catch (e) {
            erro((e as Error).message);
        }
    }

    async reverterUltimaAlteracao(usuario: string): Promise<void> {
        const transacao = this.journal.ultimaAlteracao("parametros.json");

        if (transacao === null) {
            aviso("Nenhuma alteração de parâmetros para reverter.");
            return;
        }

        const atual = transacao.getDadosDepois() ?? this.parametros.valoresPadrao();
        const anterior = transacao.getDadosAntes() ?? this.parametros.valoresPadrao();

        console.log("Última alteração dos parâmetros:");
        console.log(`  Feita por ${transacao.getUsuarioResponsavel()} em ${transacao.getTimestamp().toLocaleString("pt-BR")}`);
        console.log("  Ao reverter:");

        for (const linha of this.descreverMudancas(atual, anterior)) {
            console.log(`    ${linha}`);
        }

        const senha = await this.historico.perguntarSenha(this.terminal, "Para confirmar, digite a sua senha: ");

        if (!this.autenticacao.confirmarSenha(usuario, senha)) {
            erro("Senha incorreta. Nada foi revertido.");
            return;
        }

        this.journal.registrar("REVERTER", "parametros.json", null, { transacaoRevertida: transacao.getId() });

        if (this.parametros.reverterAlteracao(transacao)) {
            sucesso("Alteração revertida.");
        } else {
            erro("Não foi possível reverter esta alteração.");
        }
    }

    private descreverMudancas(atual: any, anterior: any): string[] {
        const linhas: string[] = [];

        if (atual.aliquotaImposto !== anterior.aliquotaImposto) {
            linhas.push(
                `Alíquota de impostos: ${this.formatarPercentual(atual.aliquotaImposto)} volta para ${this.formatarPercentual(anterior.aliquotaImposto)}`
            );
        }

        for (const tipo of Object.values(TipoEquipamento)) {
            const valorAtual = atual.coeficientesDepreciacao[tipo];
            const valorAnterior = anterior.coeficientesDepreciacao[tipo];

            if (valorAtual !== valorAnterior) {
                linhas.push(
                    `Depreciação de ${tipo}: ${this.formatarPercentual(valorAtual)} volta para ${this.formatarPercentual(valorAnterior)} ao ano`
                );
            }
        }

        if (linhas.length === 0) {
            linhas.push("Nenhum valor muda.");
        }

        return linhas;
    }

    private problemaPercentual(texto: string, nome: string): string | null {
        const valor = converterValor(texto);

        if (valor === null || valor > 100) {
            return `${nome} precisa ser um percentual entre 0 e 100.`;
        }

        return null;
    }

    private formatarPercentual(valor: number): string {
        return `${valor.toLocaleString("pt-BR")}%`;
    }
}