import { RepositorioArquivo } from "../persistencia/RepositorioArquivo.js";
import { ServicoOrganizacao } from "./ServicoOrganizacao.js";
import { ServicoEquipamento } from "./ServicoEquipamento.js";
import { ValidadorDataEntrada } from "../validadores/ValidadorDataEntrada.js";
import { Lote } from "../entidades/Lote.js";
import { Equipamento } from "../entidades/Equipamento.js";
import { StatusLote } from "../enums/StatusLote.js";
import { StatusRastreamento } from "../enums/StatusRastreamento.js";
import { EstadoFisico } from "../enums/EstadoFisico.js";

const ARQUIVO_LOTES = "lotes.json";

export class ServicoLote {
    private readonly repositorio: RepositorioArquivo;
    private readonly organizacoes: ServicoOrganizacao;
    private readonly equipamentos: ServicoEquipamento;
    private readonly validadorData: ValidadorDataEntrada;

    constructor(repositorio: RepositorioArquivo, organizacoes: ServicoOrganizacao, equipamentos: ServicoEquipamento) {
        this.repositorio = repositorio;
        this.organizacoes = organizacoes;
        this.equipamentos = equipamentos;
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

    adicionarEquipamentoLote(loteId: string, dados: any, responsavel: string): Equipamento {
        const lote = this.buscarLote(loteId);
        const status = lote.getStatusProcessamento();

        if (status !== StatusLote.RECEBIDO && status !== StatusLote.EM_TRIAGEM) {
            throw new Error(`O lote ${lote.getId()} está com status ${status} e não aceita novos equipamentos.`);
        }

        const statusInicial = status === StatusLote.EM_TRIAGEM ? StatusRastreamento.EM_TRIAGEM : StatusRastreamento.AGUARDANDO_TRIAGEM;
        const posicao = lote.getEquipamentos().length + 1;

        const equipamento = this.equipamentos.cadastrarEquipamento(lote.getId(), posicao, statusInicial, dados, responsavel);
        lote.adicionarEquipamento(equipamento);

        return equipamento;
    }

    processarTriagem(loteId: string, responsavel: string): void {
        const lote = this.buscarLote(loteId);

        if (lote.getStatusProcessamento() !== StatusLote.RECEBIDO) {
            throw new Error(`A triagem só pode ser iniciada em lotes com status RECEBIDO. O lote ${lote.getId()} está ${lote.getStatusProcessamento()}.`);
        }

        if (lote.getEquipamentos().length === 0) {
            throw new Error(`O lote ${lote.getId()} não tem equipamentos. Adicione os equipamentos antes de iniciar a triagem.`);
        }

        for (const equipamento of lote.getEquipamentos()) {
            equipamento.atualizarStatus(StatusRastreamento.EM_TRIAGEM, "Início da triagem do lote", responsavel);
            this.equipamentos.salvar(equipamento);
        }

        lote.alterarStatus(StatusLote.EM_TRIAGEM);
        this.repositorio.salvarEntidade(ARQUIVO_LOTES, lote.paraDados());
    }

    avaliarEquipamento(codigoEquipamento: string, novoEstado: EstadoFisico, justificativa: string, responsavel: string): Equipamento {
        const equipamento = this.equipamentos.buscarEquipamento(codigoEquipamento);

        if (equipamento.getStatusRastreamento() !== StatusRastreamento.EM_TRIAGEM) {
            throw new Error(`O equipamento ${equipamento.getCodigoBarrasInterno()} não está em triagem (status: ${equipamento.getStatusRastreamento()}).`);
        }

        const avaliado = this.equipamentos.atualizarEstadoFisico(equipamento.getId(), novoEstado, justificativa, responsavel);

        const lote = this.buscarLote(avaliado.getLoteId());
        const faltamTriar = lote.getEquipamentos().filter((e) => e.getStatusRastreamento() === StatusRastreamento.EM_TRIAGEM);

        if (faltamTriar.length === 0) {
            lote.alterarStatus(StatusLote.TRIAGEM_CONCLUIDA);
            this.repositorio.salvarEntidade(ARQUIVO_LOTES, lote.paraDados());
        }

        return avaliado;
    }

    buscarLote(id: string): Lote {
        const dados = this.repositorio.carregarEntidade(ARQUIVO_LOTES, id.trim().toUpperCase());

        if (dados === null) {
            throw new Error(`Lote "${id}" não encontrado.`);
        }

        const lote = Lote.deDados(dados);

        for (const equipamento of this.equipamentos.listarPorLote(lote.getId())) {
            lote.adicionarEquipamento(equipamento);
        }

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