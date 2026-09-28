import type { Interface } from "node:readline/promises";
import { ServicoParametros } from "../../servicos/ServicoParametros.js";
import { TipoEquipamento } from "../../enums/TipoEquipamento.js";
import { converterValor } from "../conversores.js";
import { escolherOpcao, perguntarValido } from "../perguntas.js";
import { sucesso, aviso, erro } from "../mensagens.js";

export class TelaParametros {
    private parametros: ServicoParametros;
    private terminal: Interface;

    constructor(parametros: ServicoParametros, terminal: Interface) {
        this.parametros = parametros;
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
            "Nova alíquota em % (ex.: 15 ou 15,5; \"cancelar\" para voltar): ",
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
            "Novo coeficiente em % ao ano (ex.: 20; \"cancelar\" para voltar): ",
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