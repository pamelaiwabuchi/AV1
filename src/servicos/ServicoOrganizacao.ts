import { RepositorioArquivo } from "../persistencia/RepositorioArquivo.js";
import { ValidadorCNPJ } from "../validadores/ValidadorCNPJ.js";
import { Organizacao } from "../entidades/Organizacao.js";
import { Contrato } from "../entidades/Contrato.js";

const ARQUIVO_ORGANIZACOES = "organizacoes.json";
const ARQUIVO_CONTRATOS_ANTERIORES = "contratos-anteriores.json";

export interface ContratoNoHistorico {
    contrato: Contrato;
    fimEfetivo: Date;
    atual: boolean;
}

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

        const problemaCnpj = this.verificarCnpj(dados.cnpj);

        if (problemaCnpj !== null) {
            throw new Error(problemaCnpj);
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

    verificarCnpj(cnpj: string): string | null {
        if (!this.validadorCNPJ.validar(cnpj)) {
            return this.validadorCNPJ.obterMensagemErro();
        }

        const limpo = this.validadorCNPJ.limpar(cnpj);

        if (this.listarTodas().find((o) => o.getCnpj() === limpo) !== undefined) {
            return "Já existe uma organização cadastrada com este CNPJ.";
        }

        return null;
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

        const contratoAnterior = organizacao.getContratoVigente();

        if (contratoAnterior !== null) {
            this.guardarContratoAnterior(contratoAnterior, contrato.getDataAssinatura());
        }

        organizacao.definirContrato(contrato);
        this.repositorio.salvarEntidade(ARQUIVO_ORGANIZACOES, organizacao.paraDados());

        return contrato;
    }

    listarOrganizacoes(): Organizacao[] {
        return this.listarTodas();
    }

    listarContratosDaOrganizacao(organizacaoId: string): ContratoNoHistorico[] {
        const organizacao = this.buscarOrganizacao(organizacaoId);
        const resultado: ContratoNoHistorico[] = [];

        for (const dados of this.repositorio.listarEntidades(ARQUIVO_CONTRATOS_ANTERIORES)) {
            if (dados.organizacaoId === organizacao.getId()) {
                resultado.push({
                    contrato: Contrato.deDados(dados),
                    fimEfetivo: new Date(dados.fimEfetivo),
                    atual: false
                });
            }
        }

        const atual = organizacao.getContratoVigente();

        if (atual !== null) {
            resultado.push({
                contrato: atual,
                fimEfetivo: atual.getDataVencimento(),
                atual: true
            });
        }

        return resultado;
    }

    private guardarContratoAnterior(anterior: Contrato, inicioDoNovo: Date): void {
        const diaAnteriorAoNovo = new Date(inicioDoNovo);
        diaAnteriorAoNovo.setDate(diaAnteriorAoNovo.getDate() - 1);

        let fimEfetivo = anterior.getDataVencimento();

        if (diaAnteriorAoNovo.getTime() < fimEfetivo.getTime()) {
            fimEfetivo = diaAnteriorAoNovo;
        }

        const dados = anterior.paraDados();
        dados.fimEfetivo = fimEfetivo;

        this.repositorio.salvarEntidade(ARQUIVO_CONTRATOS_ANTERIORES, dados);
    }

    private gerarCodigoContrato(): string {
        let maiorNumero = 0;

        for (const dados of this.repositorio.listarEntidades(ARQUIVO_CONTRATOS_ANTERIORES)) {
            const numero = Number(String(dados.id).replace("CT", ""));

            if (numero > maiorNumero) {
                maiorNumero = numero;
            }
        }

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