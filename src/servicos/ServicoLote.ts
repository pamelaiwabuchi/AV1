import { RepositorioArquivo } from "../persistencia/RepositorioArquivo.js";
import { ServicoOrganizacao } from "./ServicoOrganizacao.js";
import { ValidadorDataEntrada } from "../validadores/ValidadorDataEntrada.js";
import { Lote } from "../entidades/Lote.js";
import { StatusLote } from "../enums/StatusLote.js";

const ARQUIVO_LOTES = "lotes.json";

export class ServicoLote {
    private readonly repositorio: RepositorioArquivo;
    private readonly organizacoes: ServicoOrganizacao;
    private readonly validadorData: ValidadorDataEntrada;

    constructor(repositorio: RepositorioArquivo, organizacoes: ServicoOrganizacao) {
        this.repositorio = repositorio;
        this.organizacoes = organizacoes;
        this.validadorData = new ValidadorDataEntrada();
    }

    criarLote(dados: any): Lote {
        const organizacao = this.organizacoes.buscarOrganizacao(dados.organizacaoId);

        if (!organizacao.isAtivo()) {
            throw new Error(`A organização "${organizacao.getId()}" está desativada e não pode registrar lotes.`);
        }

        const contrato = organizacao.getContratoVigente();

        if (contrato === null || !contrato.estaVigente()) {
            throw new Error(
                `A organização "${organizacao.getId()}" não possui contrato vigente. ` +
                `Um operador de cadastro ou administrador precisa usar as opções "Cadastrar contrato" ou "Renovar contrato".`
            );
        }

        const notaFiscal = dados.notaFiscal.trim();
        const transportadora = dados.transportadora.trim();

        if (notaFiscal === "") {
            throw new Error("A nota fiscal é obrigatória.");
        }

        if (transportadora === "") {
            throw new Error("A transportadora é obrigatória.");
        }

        if (!this.validadorData.validar(dados.dataEntrada)) {
            throw new Error(this.validadorData.obterMensagemErro());
        }

        const todos = this.listarTodos();

        const notaRepetida = todos.find((l) => l.getOrganizacaoId() === organizacao.getId() && l.getNotaFiscal() === notaFiscal);

        if (notaRepetida !== undefined) {
            throw new Error(`A nota fiscal ${notaFiscal} já foi registrada para a organização ${organizacao.getId()} no lote ${notaRepetida.getId()}.`);
        }

        const id = "LT" + String(todos.length + 1).padStart(3, "0");

        const lote = new Lote(
            id,
            dados.dataEntrada,
            organizacao.getId(),
            notaFiscal,
            transportadora,
            StatusLote.RECEBIDO,
            dados.observacoes.trim()
        );

        this.repositorio.salvarEntidade(ARQUIVO_LOTES, lote.paraDados());

        return lote;
    }

    consultarLotePorPeriodo(dataInicio: Date, dataFim: Date): Lote[] {
        if (dataFim.getTime() < dataInicio.getTime()) {
            throw new Error("A data final precisa ser igual ou posterior à data inicial.");
        }

        return this.listarTodos().filter((l) => {
            const entrada = l.getDataEntrada().getTime();
            return entrada >= dataInicio.getTime() && entrada <= dataFim.getTime();
        });
    }

    private listarTodos(): Lote[] {
        return this.repositorio.listarEntidades(ARQUIVO_LOTES).map((dados) => Lote.deDados(dados));
    }
}