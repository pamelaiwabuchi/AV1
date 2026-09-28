import { RepositorioArquivo } from "../persistencia/RepositorioArquivo.js";
import { ValidadorCNPJ } from "../validadores/ValidadorCNPJ.js";
import { Organizacao } from "../entidades/Organizacao.js";

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

    private listarTodas(): Organizacao[] {
        return this.repositorio.listarEntidades(ARQUIVO_ORGANIZACOES).map((dados) => Organizacao.deDados(dados));
    }
}