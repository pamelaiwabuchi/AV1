import { RepositorioArquivo } from "../persistencia/RepositorioArquivo.js";
import { ValidadorCNPJ } from "../validadores/ValidadorCNPJ.js";
import { Organizacao } from "../entidades/Organizacao.js";
import { Contrato } from "../entidades/Contrato.js";

const ARQUIVO_ORGANIZACOES = "organizacoes.json";

export class ServicoOrganizacao {
    private readonly repositorio: RepositorioArquivo;
    private readonly validadorCNPJ: ValidadorCNPJ;

    constructor(repositorio: RepositorioArquivo) {
        this.repositorio = repositorio;
        this.validadorCNPJ = new ValidadorCNPJ();
    }

    cadastrarOrganizacao(dados: any): Organizacao {
        const razaoSocial = dados.razaoSocial.trim();
        const inscricaoEstadual = dados.inscricaoEstadual.trim();
        const enderecoCompleto = dados.enderecoCompleto.trim();
        const telefone = dados.telefone.trim();
        const email = dados.email.trim();

        if (razaoSocial === "") {
            throw new Error("A razão social é obrigatória.");
        }

        if (!this.validadorCNPJ.validar(dados.cnpj)) {
            throw new Error(this.validadorCNPJ.obterMensagemErro());
        }

        if (inscricaoEstadual === "") {
            throw new Error("A inscrição estadual é obrigatória.");
        }

        if (enderecoCompleto === "") {
            throw new Error("O endereço completo é obrigatório.");
        }

        if (telefone === "") {
            throw new Error("O telefone é obrigatório.");
        }

        if (email === "") {
            throw new Error("O e-mail é obrigatório.");
        }

        const cnpj = this.validadorCNPJ.limpar(dados.cnpj);
        const todas = this.listarTodas();

        if (todas.find((o) => o.getCnpj() === cnpj) !== undefined) {
            throw new Error("Já existe uma organização cadastrada com este CNPJ.");
        }

        const id = "BR" + String(todas.length + 1).padStart(3, "0");

        const organizacao = new Organizacao(
            id,
            razaoSocial,
            cnpj,
            inscricaoEstadual,
            enderecoCompleto,
            telefone,
            email,
            new Date(),
            true,
            null
        );

        this.repositorio.salvarEntidade(ARQUIVO_ORGANIZACOES, organizacao.paraDados());

        return organizacao;
    }

    buscarOrganizacao(id: string): Organizacao {
        const dados = this.repositorio.carregarEntidade(ARQUIVO_ORGANIZACOES, id.trim().toUpperCase());

        if (dados === null) {
            throw new Error(`Organização "${id}" não encontrada.`);
        }

        return Organizacao.deDados(dados);
    }

    listarOrganizacoesAtivas(): Organizacao[] {
        return this.listarTodas().filter((o) => o.isAtivo());
    }

    renovarContrato(organizacaoId: string, novoVencimento: Date): void {
        const organizacao = this.buscarOrganizacao(organizacaoId);
        const contrato = organizacao.getContratoVigente();

        if (contrato === null) {
            throw new Error(`A organização "${organizacao.getId()}" não possui contrato.`);
        }

        contrato.renovar(novoVencimento);

        this.repositorio.salvarEntidade(ARQUIVO_ORGANIZACOES, organizacao.paraDados());
    }

    registrarContrato(organizacaoId: string, dados: any): Contrato {
        const organizacao = this.buscarOrganizacao(organizacaoId);

        if (!organizacao.isAtivo()) {
            throw new Error(`A organização "${organizacao.getId()}" está desativada.`);
        }

        if (dados.dataVencimento.getTime() <= dados.dataAssinatura.getTime()) {
            throw new Error("A data de vencimento precisa ser depois da data de assinatura.");
        }

        if (dados.clausulas.length === 0) {
            throw new Error("O contrato precisa ter pelo menos uma cláusula.");
        }

        if (dados.valorMensal < 0) {
            throw new Error("O valor mensal não pode ser negativo.");
        }

        const contrato = new Contrato(
            this.gerarCodigoContrato(),
            organizacao.getId(),
            dados.dataAssinatura,
            dados.dataVencimento,
            dados.clausulas,
            dados.valorMensal,
            dados.renovacaoAutomatica
        );

        organizacao.definirContrato(contrato);
        this.repositorio.salvarEntidade(ARQUIVO_ORGANIZACOES, organizacao.paraDados());

        return contrato;
    }

    private gerarCodigoContrato(): string {
        let maiorNumero = 0;

        for (const organizacao of this.listarTodas()) {
            const contrato = organizacao.getContratoVigente();

            if (contrato !== null) {
                const numero = Number(contrato.getId().replace("CT", ""));

                if (numero > maiorNumero) {
                    maiorNumero = numero;
                }
            }
        }

        return "CT" + String(maiorNumero + 1).padStart(3, "0");
    }

    private listarTodas(): Organizacao[] {
        return this.repositorio.listarEntidades(ARQUIVO_ORGANIZACOES).map((dados) => Organizacao.deDados(dados));
    }
}