import type { Interface } from "node:readline/promises";
import { ServicoOrganizacao } from "../../servicos/ServicoOrganizacao.js";
import { Organizacao } from "../../entidades/Organizacao.js";
import { converterData, converterValor, formatarData, formatarValor } from "../conversores.js";

export class TelaOrganizacoes {
    private organizacao: ServicoOrganizacao;
    private terminal: Interface;

    constructor(organizacao: ServicoOrganizacao, terminal: Interface) {
        this.organizacao = organizacao;
        this.terminal = terminal;
    }

    async cadastrar(): Promise<void> {
        const razaoSocial = await this.terminal.question("Razão social: ");
        const cnpj = await this.terminal.question("CNPJ: ");
        const inscricaoEstadual = await this.terminal.question("Inscrição estadual: ");
        const enderecoCompleto = await this.terminal.question("Endereço completo: ");
        const telefone = await this.terminal.question("Telefone: ");
        const email = await this.terminal.question("E-mail: ");

        try {
            const nova = this.organizacao.cadastrarOrganizacao({
                razaoSocial,
                cnpj,
                inscricaoEstadual,
                enderecoCompleto,
                telefone,
                email
            });

            console.log(`Organização cadastrada com o código ${nova.getId()}.`);
        } catch (erro) {
            console.log((erro as Error).message);
        }
    }

    listar(): void {
        const organizacoes = this.organizacao.listarOrganizacoesAtivas();

        if (organizacoes.length === 0) {
            console.log("Nenhuma organização cadastrada.");
            return;
        }

        console.log("Organizações ativas:");

        for (const org of organizacoes) {
            console.log(`  ${org.getId()} - ${org.getRazaoSocial()} - CNPJ ${org.getCnpj()}`);
        }
    }

    async cadastrarContrato(): Promise<void> {
        const organizacao = await this.perguntarOrganizacao();

        if (organizacao === null) {
            return;
        }

        const contratoAtual = organizacao.getContratoVigente();

        if (contratoAtual !== null) {
            console.log(`Esta organização já possui o contrato ${contratoAtual.getId()} (vencimento: ${formatarData(contratoAtual.getDataVencimento())}).`);
            const resposta = await this.terminal.question("Este contrato substituirá o atual. Deseja prosseguir com a mudança? (S/N): ");

            if (resposta.trim().toUpperCase() !== "S") {
                console.log("Operação cancelada. O contrato atual foi mantido.");
                return;
            }
        }

        const dataAssinatura = converterData(await this.terminal.question("Data de assinatura (dd/mm/aaaa): "));

        if (dataAssinatura === null) {
            console.log("Data de assinatura inválida. Use o formato dd/mm/aaaa.");
            return;
        }

        const dataVencimento = converterData(await this.terminal.question("Data de vencimento (dd/mm/aaaa): "));

        if (dataVencimento === null) {
            console.log("Data de vencimento inválida. Use o formato dd/mm/aaaa.");
            return;
        }

        console.log("Digite as cláusulas do contrato, uma por linha.");
        console.log("Quando terminar, aperte Enter numa linha vazia.");

        const clausulas: string[] = [];

        while (true) {
            const clausula = (await this.terminal.question(`  Cláusula ${clausulas.length + 1}: `)).trim();

            if (clausula === "") {
                break;
            }

            clausulas.push(clausula);
        }

        if (clausulas.length === 0) {
            console.log("O contrato precisa ter pelo menos uma cláusula.");
            return;
        }

        const valorMensal = converterValor(await this.terminal.question("Valor mensal (ex.: 1500,00): "));

        if (valorMensal === null) {
            console.log("Valor mensal inválido. Use números, com vírgula para os centavos.");
            return;
        }

        const respostaRenovacao = (await this.terminal.question("Renovação automática? (S/N): ")).trim().toUpperCase();

        if (respostaRenovacao !== "S" && respostaRenovacao !== "N") {
            console.log("Resposta inválida. Digite S ou N.");
            return;
        }

        try {
            const contrato = this.organizacao.registrarContrato(organizacao.getId(), {
                dataAssinatura,
                dataVencimento,
                clausulas,
                valorMensal,
                renovacaoAutomatica: respostaRenovacao === "S"
            });

            console.log(`Contrato ${contrato.getId()} registrado para a organização ${organizacao.getId()}.`);
        } catch (erro) {
            console.log((erro as Error).message);
        }
    }

    async renovarContrato(): Promise<void> {
        const organizacao = await this.perguntarOrganizacao();

        if (organizacao === null) {
            return;
        }

        const contrato = organizacao.getContratoVigente();

        if (contrato === null) {
            console.log(`A organização ${organizacao.getId()} não possui contrato.`);
            return;
        }

        console.log(`Contrato ${contrato.getId()} - vencimento atual: ${formatarData(contrato.getDataVencimento())}`);

        const novoVencimento = converterData(await this.terminal.question("Novo vencimento (dd/mm/aaaa): "));

        if (novoVencimento === null) {
            console.log("Data inválida. Use o formato dd/mm/aaaa.");
            return;
        }

        try {
            this.organizacao.renovarContrato(organizacao.getId(), novoVencimento);
            console.log(`Contrato renovado até ${formatarData(novoVencimento)}.`);
        } catch (erro) {
            console.log((erro as Error).message);
        }
    }

    async consultarContrato(): Promise<void> {
        const organizacao = await this.perguntarOrganizacao();

        if (organizacao === null) {
            return;
        }

        const contrato = organizacao.getContratoVigente();

        if (contrato === null) {
            console.log(`A organização ${organizacao.getId()} não possui contrato.`);
            return;
        }

        console.log(`Contrato ${contrato.getId()} - ${organizacao.getRazaoSocial()}`);
        console.log(`  Assinatura: ${formatarData(contrato.getDataAssinatura())}`);
        console.log(`  Vencimento: ${formatarData(contrato.getDataVencimento())}`);
        console.log(`  Situação: ${contrato.estaVigente() ? "vigente" : "fora da vigência"}`);
        console.log(`  Valor mensal: ${formatarValor(contrato.getValorMensal())}`);
        console.log(`  Renovação automática: ${contrato.isRenovacaoAutomatica() ? "sim" : "não"}`);
        console.log("  Cláusulas:");

        contrato.getClausulas().forEach((clausula, i) => {
            console.log(`    ${i + 1}. ${clausula}`);
        });
    }

    private async perguntarOrganizacao(): Promise<Organizacao | null> {
        const codigo = await this.terminal.question("Código da organização (ex.: BR001): ");

        try {
            return this.organizacao.buscarOrganizacao(codigo);
        } catch (erro) {
            console.log((erro as Error).message);
            return null;
        }
    }
}