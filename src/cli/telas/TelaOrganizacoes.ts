import type { Interface } from "node:readline/promises";
import { ServicoOrganizacao } from "../../servicos/ServicoOrganizacao.js";
import { Organizacao } from "../../entidades/Organizacao.js";
import { converterData, converterValor, formatarData, formatarValor } from "../conversores.js";
import { dataValida, pediuCancelamento, mensagemDeErro, mostrarComoCancelar, naoVazio, perguntarSimOuNao, perguntarValido } from "../perguntas.js";
import { sucesso, aviso, erro } from "../mensagens.js";

export class TelaOrganizacoes {
    private organizacao: ServicoOrganizacao;
    private terminal: Interface;

    constructor(organizacao: ServicoOrganizacao, terminal: Interface) {
        this.organizacao = organizacao;
        this.terminal = terminal;
    }

    async cadastrar(): Promise<void> {
        mostrarComoCancelar();

        const razaoSocial = await perguntarValido(this.terminal, "Razão social: ", naoVazio("A razão social é obrigatória."), true);
        if (razaoSocial === null) {
            aviso("Cadastro de organização cancelado.");
            return;
        }

        const cnpj = await perguntarValido(this.terminal, "CNPJ: ", (texto) => this.organizacao.verificarCnpj(texto), true);
        if (cnpj === null) {
            aviso("Cadastro de organização cancelado.");
            return;
        }

        const inscricaoEstadual = await perguntarValido(this.terminal, "Inscrição estadual: ", naoVazio("A inscrição estadual é obrigatória."), true);
        if (inscricaoEstadual === null) {
            aviso("Cadastro de organização cancelado.");
            return;
        }

        const enderecoCompleto = await perguntarValido(this.terminal, "Endereço completo: ", naoVazio("O endereço completo é obrigatório."), true);
        if (enderecoCompleto === null) {
            aviso("Cadastro de organização cancelado.");
            return;
        }

        const telefone = await perguntarValido(this.terminal, "Telefone: ", naoVazio("O telefone é obrigatório."), true);
        if (telefone === null) {
            aviso("Cadastro de organização cancelado.");
            return;
        }

        const email = await perguntarValido(this.terminal, "E-mail: ", naoVazio("O e-mail é obrigatório."), true);
        if (email === null) {
            aviso("Cadastro de organização cancelado.");
            return;
        }

        try {
            const nova = this.organizacao.cadastrarOrganizacao({
                razaoSocial,
                cnpj,
                inscricaoEstadual,
                enderecoCompleto,
                telefone,
                email
            });

            sucesso(`Organização cadastrada com o código ${nova.getId()}.`);
        } catch (e) {
            erro((e as Error).message);
        }
    }

    listar(): void {
        const organizacoes = this.organizacao.listarOrganizacoesAtivas();

        if (organizacoes.length === 0) {
            aviso("Nenhuma organização cadastrada.");
            return;
        }

        console.log("Organizações ativas:");

        for (const org of organizacoes) {
            console.log(`  ${org.getId()} - ${org.getRazaoSocial()} - CNPJ ${org.getCnpj()}`);
        }
    }

    async cadastrarContrato(parametros: Record<string, string> = {}): Promise<void> {
        mostrarComoCancelar();

        const organizacao = await this.perguntarOrganizacao(parametros);

        if (organizacao === null) {
            aviso("Cadastro de contrato cancelado.");
            return;
        }

        const contratoAtual = organizacao.getContratoVigente();

        if (contratoAtual !== null) {
            console.log(`Esta organização já possui o contrato ${contratoAtual.getId()} (vencimento: ${formatarData(contratoAtual.getDataVencimento())}).`);
            const prosseguir = await perguntarSimOuNao(this.terminal, "Este contrato substituirá o atual. Deseja prosseguir com a mudança? (S/N): ");

            if (prosseguir !== true) {
                aviso("Operação cancelada. O contrato atual foi mantido.");
                return;
            }
        }

        const textoAssinatura = await perguntarValido(this.terminal, "Data de assinatura (dd/mm/aaaa): ", dataValida, true);
        if (textoAssinatura === null) {
            aviso("Cadastro de contrato cancelado.");
            return;
        }
        const dataAssinatura = converterData(textoAssinatura) as Date;

        const textoVencimento = await perguntarValido(this.terminal, "Data de vencimento (dd/mm/aaaa): ", (texto) => {
            const vencimento = converterData(texto);

            if (vencimento === null) {
                return "Data inválida. Use o formato dd/mm/aaaa.";
            }

            if (vencimento.getTime() <= dataAssinatura.getTime()) {
                return "A data de vencimento precisa ser depois da data de assinatura.";
            }

            return null;
        }, true);
        if (textoVencimento === null) {
            aviso("Cadastro de contrato cancelado.");
            return;
        }
        const dataVencimento = converterData(textoVencimento) as Date;

        console.log("Digite as cláusulas do contrato, uma por linha.");
        console.log("Quando terminar, aperte Enter numa linha vazia.");

        const clausulas: string[] = [];

        while (true) {
            const clausula = (await this.terminal.question(`  Cláusula ${clausulas.length + 1}: `)).trim();

            if (pediuCancelamento(clausula, true)) {
                aviso("Cadastro de contrato cancelado.");
                return;
            }

            if (clausula !== "") {
                clausulas.push(clausula);
                continue;
            }

            if (clausulas.length > 0) {
                break;
            }

            erro("O contrato precisa ter pelo menos uma cláusula.");
        }

        const textoValor = await perguntarValido(this.terminal, "Valor mensal (ex.: 1500,00): ", (texto) => {
            if (converterValor(texto) === null) {
                return "Valor mensal inválido. Use números, com vírgula para os centavos.";
            }

            return null;
        }, false);
        if (textoValor === null) {
            aviso("Cadastro de contrato cancelado.");
            return;
        }
        const valorMensal = converterValor(textoValor) as number;

        const renovacaoAutomatica = await perguntarSimOuNao(this.terminal, "Renovação automática? (S/N): ");
        if (renovacaoAutomatica === null) {
            aviso("Cadastro de contrato cancelado.");
            return;
        }

        try {
            const contrato = this.organizacao.registrarContrato(organizacao.getId(), {
                dataAssinatura,
                dataVencimento,
                clausulas,
                valorMensal,
                renovacaoAutomatica
            });

            sucesso(`Contrato ${contrato.getId()} registrado para a organização ${organizacao.getId()}.`);
        } catch (e) {
            erro((e as Error).message);
        }
    }

    async renovarContrato(parametros: Record<string, string> = {}): Promise<void> {
        mostrarComoCancelar();

        const organizacao = await this.perguntarOrganizacao(parametros);

        if (organizacao === null) {
            aviso("Renovação cancelada.");
            return;
        }

        const contrato = organizacao.getContratoVigente();

        if (contrato === null) {
            aviso(`A organização ${organizacao.getId()} não possui contrato.`);
            return;
        }

        console.log(`Contrato ${contrato.getId()} - vencimento atual: ${formatarData(contrato.getDataVencimento())}`);

        const textoNovo = await perguntarValido(this.terminal, "Novo vencimento (dd/mm/aaaa): ", (texto) => {
            const novo = converterData(texto);

            if (novo === null) {
                return "Data inválida. Use o formato dd/mm/aaaa.";
            }

            if (novo.getTime() <= contrato.getDataVencimento().getTime()) {
                return "O novo vencimento precisa ser depois do vencimento atual.";
            }

            return null;
        }, true);

        if (textoNovo === null) {
            aviso("Renovação cancelada.");
            return;
        }

        const novoVencimento = converterData(textoNovo) as Date;

        try {
            this.organizacao.renovarContrato(organizacao.getId(), novoVencimento);
            sucesso(`Contrato renovado até ${formatarData(novoVencimento)}.`);
        } catch (e) {
            erro((e as Error).message);
        }
    }

    async consultarContrato(parametros: Record<string, string> = {}): Promise<void> {
        const organizacao = await this.perguntarOrganizacao(parametros);

        if (organizacao === null) {
            aviso("Consulta cancelada.");
            return;
        }

        const contrato = organizacao.getContratoVigente();

        if (contrato === null) {
            aviso(`A organização ${organizacao.getId()} não possui contrato.`);
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

    private async perguntarOrganizacao(parametros: Record<string, string>): Promise<Organizacao | null> {
        const codigo = await perguntarValido(
            this.terminal,
            "Código da organização (ex.: BR001): ",
            (texto) => mensagemDeErro(() => this.organizacao.buscarOrganizacao(texto)),
            true,
            parametros["org"]
        );

        if (codigo === null) {
            return null;
        }

        return this.organizacao.buscarOrganizacao(codigo);
    }
}