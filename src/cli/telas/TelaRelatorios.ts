import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Interface } from "node:readline/promises";
import { ServicoRelatorio } from "../../servicos/ServicoRelatorio.js";
import { ServicoOrganizacao } from "../../servicos/ServicoOrganizacao.js";
import { StatusRastreamento } from "../../enums/StatusRastreamento.js";
import { escolherOpcao, escolherPeriodo, mensagemDeErro, mostrarDisponiveis, perguntarSimOuNao, perguntarValido } from "../perguntas.js";
import { sucesso, aviso, erro } from "../mensagens.js";

const PASTA_RELATORIOS = "relatorios";
const TODOS_OS_STATUS = "TODOS OS STATUS";

const POR_ORGANIZACAO = "Relatório por organização";
const POR_STATUS = "Relatório por status";
const FINANCEIRO = "Relatório financeiro";
const TIPOS_DE_RELATORIO = [POR_ORGANIZACAO, POR_STATUS, FINANCEIRO];

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
        await this.gerarEmSequencia(POR_ORGANIZACAO, parametros);
    }

    async porStatus(): Promise<void> {
        await this.gerarEmSequencia(POR_STATUS, {});
    }

    async financeiro(): Promise<void> {
        await this.gerarEmSequencia(FINANCEIRO, {});
    }

    private async gerarEmSequencia(primeiroTipo: string, parametros: Record<string, string>): Promise<void> {
        let tipo: string | null = primeiroTipo;
        let parametrosDaVez = parametros;

        while (tipo !== null) {
            const gerou = await this.gerar(tipo, parametrosDaVez);

            if (!gerou) {
                return;
            }

            parametrosDaVez = {};

            console.log("");
            tipo = await escolherOpcao(this.terminal, "Deseja gerar outro relatório?", TIPOS_DE_RELATORIO, "voltar ao menu");
        }
    }

    private async gerar(tipo: string, parametros: Record<string, string>): Promise<boolean> {
        if (tipo === POR_ORGANIZACAO) {
            return this.gerarPorOrganizacao(parametros);
        }

        if (tipo === POR_STATUS) {
            return this.gerarPorStatus();
        }

        return this.gerarFinanceiro();
    }

    private async gerarPorOrganizacao(parametros: Record<string, string>): Promise<boolean> {
        if (parametros["org"] === undefined) {
            const todas = this.organizacao.listarOrganizacoes().reverse();
            mostrarDisponiveis("Organizações", todas.map((o) => `${o.getId()} - ${o.getRazaoSocial()}`));
        }

        const organizacaoId = await perguntarValido(
            this.terminal,
            "Código da organização (ex.: BR001): ",
            (texto) => mensagemDeErro(() => this.organizacao.buscarOrganizacao(texto)),
            true,
            parametros["org"]
        );

        if (organizacaoId === null) {
            aviso("Relatório cancelado.");
            return false;
        }

        const periodo = await escolherPeriodo(this.terminal);

        if (periodo === null) {
            aviso("Relatório cancelado.");
            return false;
        }

        const texto = this.relatorio.gerarRelatorioPorOrganizacao(organizacaoId, periodo);
        const codigo = this.organizacao.buscarOrganizacao(organizacaoId).getId();
        await this.mostrarEOferecerArquivo(texto, `organizacao-${codigo}`);
        return true;
    }

    private async gerarPorStatus(): Promise<boolean> {
        const opcoes: string[] = [...Object.values(StatusRastreamento), TODOS_OS_STATUS];
        const escolha = await escolherOpcao(this.terminal, "Status dos equipamentos", opcoes);

        if (escolha === null) {
            aviso("Relatório cancelado.");
            return false;
        }

        if (escolha === TODOS_OS_STATUS) {
            const texto = this.relatorio.gerarRelatorioTodosOsStatus();
            await this.mostrarEOferecerArquivo(texto, "status-todos");
            return true;
        }

        const status = escolha as StatusRastreamento;
        const texto = this.relatorio.gerarRelatorioPorStatus(status);
        await this.mostrarEOferecerArquivo(texto, `status-${status}`);
        return true;
    }

    private async gerarFinanceiro(): Promise<boolean> {
        const periodo = await escolherPeriodo(this.terminal);

        if (periodo === null) {
            aviso("Relatório cancelado.");
            return false;
        }

        const texto = this.relatorio.gerarRelatorioFinanceiro(periodo);
        await this.mostrarEOferecerArquivo(texto, "financeiro");
        return true;
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