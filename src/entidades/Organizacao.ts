import { Contrato } from "./Contrato.js";

export class Organizacao {
    private id: string;
    private razaoSocial: string;
    private cnpj: string;
    private inscricaoEstadual: string;
    private enderecoCompleto: string;
    private telefone: string;
    private email: string;
    private dataCadastro: Date;
    private ativo: boolean;
    private contratoVigente: Contrato | null;

    constructor(
        id: string,
        razaoSocial: string,
        cnpj: string,
        inscricaoEstadual: string,
        enderecoCompleto: string,
        telefone: string,
        email: string,
        dataCadastro: Date,
        ativo: boolean,
        contratoVigente: Contrato | null
    ) {
        this.id = id;
        this.razaoSocial = razaoSocial;
        this.cnpj = cnpj;
        this.inscricaoEstadual = inscricaoEstadual;
        this.enderecoCompleto = enderecoCompleto;
        this.telefone = telefone;
        this.email = email;
        this.dataCadastro = dataCadastro;
        this.ativo = ativo;
        this.contratoVigente = contratoVigente;
    }

    alterarEndereco(novoEndereco: string): void {
        this.enderecoCompleto = novoEndereco;
    }

    desativar(): void {
        this.ativo = false;
    }

    definirContrato(contrato: Contrato): void {
        this.contratoVigente = contrato;
    }

    paraDados(): any {
        return {
            id: this.id,
            razaoSocial: this.razaoSocial,
            cnpj: this.cnpj,
            inscricaoEstadual: this.inscricaoEstadual,
            enderecoCompleto: this.enderecoCompleto,
            telefone: this.telefone,
            email: this.email,
            dataCadastro: this.dataCadastro,
            ativo: this.ativo,
            contratoVigente: this.contratoVigente === null ? null : this.contratoVigente.paraDados()
        };
    }

    static deDados(dados: any): Organizacao {
        return new Organizacao(
            dados.id,
            dados.razaoSocial,
            dados.cnpj,
            dados.inscricaoEstadual,
            dados.enderecoCompleto,
            dados.telefone,
            dados.email,
            new Date(dados.dataCadastro),
            dados.ativo,
            dados.contratoVigente ? Contrato.deDados(dados.contratoVigente) : null
        );
    }

    getId(): string {
        return this.id;
    }

    getRazaoSocial(): string {
        return this.razaoSocial;
    }

    getCnpj(): string {
        return this.cnpj;
    }

    getInscricaoEstadual(): string {
        return this.inscricaoEstadual;
    }

    getEnderecoCompleto(): string {
        return this.enderecoCompleto;
    }

    getTelefone(): string {
        return this.telefone;
    }

    getEmail(): string {
        return this.email;
    }

    getDataCadastro(): Date {
        return this.dataCadastro;
    }

    isAtivo(): boolean {
        return this.ativo;
    }

    getContratoVigente(): Contrato | null {
        return this.contratoVigente;
    }
}