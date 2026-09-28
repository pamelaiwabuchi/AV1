import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Interface } from "node:readline/promises";
import { ServicoRelatorio } from "../../servicos/ServicoRelatorio.js";
import { ServicoOrganizacao } from "../../servicos/ServicoOrganizacao.js";
import { StatusRastreamento } from "../../enums/StatusRastreamento.js";
import { escolherOpcao, escolherPeriodo, mensagemDeErro, perguntarSimOuNao, perguntarValido } from "../perguntas.js";
import { sucesso, aviso, erro } from "../mensagens.js";

const PASTA_RELATORIOS = "relatorios";
const TODOS_OS_STATUS = "TODOS OS STATUS";

export class TelaRelatorios {
    private relatorio: ServicoRelatorio;
    private organizacao: ServicoOrganizacao;
    private terminal: Interface;

    constructor(relatorio: ServicoRelatorio, organizacao: ServicoOrganizacao, terminal: Interface) {
        this.relatorio = relatorio;
        this.organizacao = organizacao;
        this.terminal = terminal;
    }

    async porOrganizacao(parametros: Record<string, string> = {}): Promise<void> {
        const organizacaoId = await perguntarValido(
            this.terminal,
            "Código da organização (ex.: BR001): ",
            (texto) => mensagemDeErro(() => this.organizacao.buscarOrganizacao(texto)),
            true,
            parametros["org"]
        );

        if (organizacaoId === null) {
            aviso("Relatório cancelado.");
            return;
        }

        const periodo = await escolherPeriodo(this.terminal);

        if (periodo === null) {
            aviso("Relatório cancelado.");
            return;
        }

        const texto = this.relatorio.gerarRelatorioPorOrganizacao(organizacaoId, periodo);
        await this.mostrarEOferecerArquivo(texto, `organizacao-${organizacaoId.toUpperCase()}`);
    }

    async porStatus(): Promise<void> {
        const opcoes: string[] = [...Object.values(StatusRastreamento), TODOS_OS_STATUS];
        const escolha = await escolherOpcao(this.terminal, "Status dos equipamentos", opcoes);

        if (escolha === null) {
            aviso("Relatório cancelado.");
            return;
        }

        if (escolha === TODOS_OS_STATUS) {
            const texto = this.relatorio.gerarRelatorioTodosOsStatus();
            await this.mostrarEOferecerArquivo(texto, "status-todos");
            return;
        }

        const status = escolha as StatusRastreamento;
        const texto = this.relatorio.gerarRelatorioPorStatus(status);
        await this.mostrarEOferecerArquivo(texto, `status-${status}`);
    }

    async financeiro(): Promise<void> {
        const periodo = await escolherPeriodo(this.terminal);

        if (periodo === null) {
            aviso("Relatório cancelado.");
            return;
        }

        const texto = this.relatorio.gerarRelatorioFinanceiro(periodo);
        await this.mostrarEOferecerArquivo(texto, "financeiro");
    }

    private async mostrarEOferecerArquivo(texto: string, nomeBase: string): Promise<void> {
        console.log("");
        console.log(texto);
        console.log("");

        const salvar = await perguntarSimOuNao(this.terminal, "Deseja salvar este relatório em um arquivo? (S/N): ");

        if (salvar !== true) {
            return;
        }

        try {
            const agora = new Date().toISOString().replaceAll(":", "-").replace(".", "-");
            const caminho = join(PASTA_RELATORIOS, `relatorio-${nomeBase}-${agora}.txt`);

            mkdirSync(PASTA_RELATORIOS, { recursive: true });
            writeFileSync(caminho, texto + "\n", "utf8");

            sucesso(`Relatório salvo em ${caminho}`);
        } catch (e) {
            erro(`Não foi possível salvar o relatório: ${(e as Error).message}`);
        }
    }
}