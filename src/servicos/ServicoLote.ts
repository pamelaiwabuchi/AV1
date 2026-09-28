import { RepositorioArquivo } from "../persistencia/RepositorioArquivo.js";
import { ServicoOrganizacao } from "./ServicoOrganizacao.js";
import { ServicoEquipamento, DESTINOS_FINAIS } from "./ServicoEquipamento.js";
import { ValidadorDataEntrada } from "../validadores/ValidadorDataEntrada.js";
import { Lote } from "../entidades/Lote.js";
import { Organizacao } from "../entidades/Organizacao.js";
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
        const organizacao = this.buscarOrganizacaoApta(dados.organizacaoId);

        const problemaNota = this.verificarNotaFiscal(organizacao.getId(), dados.notaFiscal);

        if (problemaNota !== null) {
            throw new Error(problemaNota);
        }

        const notaFiscal = dados.notaFiscal.trim();
        const transportadora = dados.transportadora.trim();

        if (transportadora === "") {
            throw new Error("A transportadora é obrigatória.");
        }

        if (!this.validadorData.validar(dados.dataEntrada)) {
            throw new Error(this.validadorData.obterMensagemErro());
        }

        const todos = this.listarTodos();

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

    verificarOrganizacao(organizacaoId: string): string | null {
        try {
            this.buscarOrganizacaoApta(organizacaoId);
            return null;
        } catch (e) {
            return (e as Error).message;
        }
    }

    verificarNotaFiscal(organizacaoId: string, notaFiscal: string): string | null {
        const nota = notaFiscal.trim();

        if (nota === "") {
            return "A nota fiscal é obrigatória.";
        }

        const id = organizacaoId.trim().toUpperCase();
        const repetida = this.listarTodos().find((l) => l.getOrganizacaoId() === id && l.getNotaFiscal() === nota);

        if (repetida !== undefined) {
            return `A nota fiscal ${nota} já foi registrada para a organização ${id} no lote ${repetida.getId()}.`;
        }

        return null;
    }

    verificarLoteAceitaEquipamentos(loteId: string): string | null {
        try {
            const lote = this.buscarLote(loteId);
            const status = lote.getStatusProcessamento();

            if (status !== StatusLote.RECEBIDO && status !== StatusLote.EM_TRIAGEM) {
                return `O lote ${lote.getId()} está com status ${status} e não aceita novos equipamentos.`;
            }

            return null;
        } catch (e) {
            return (e as Error).message;
        }
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
        this.recalcularStatus(avaliado.getLoteId());

        return avaliado;
    }

    movimentarEquipamento(codigoEquipamento: string, novoStatus: StatusRastreamento, justificativa: string, responsavel: string): Equipamento {
        const movimentado = this.equipamentos.movimentarEquipamento(codigoEquipamento, novoStatus, justificativa, responsavel);
        this.recalcularStatus(movimentado.getLoteId());

        return movimentado;
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

    private buscarOrganizacaoApta(organizacaoId: string): Organizacao {
        const organizacao = this.organizacoes.buscarOrganizacao(organizacaoId);

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

        return organizacao;
    }

    private recalcularStatus(loteId: string): void {
        const lote = this.buscarLote(loteId);
        const equipamentos = lote.getEquipamentos();

        const faltaTriar = equipamentos.some((e) =>
            e.getStatusRastreamento() === StatusRastreamento.AGUARDANDO_TRIAGEM ||
            e.getStatusRastreamento() === StatusRastreamento.EM_TRIAGEM
        );

        if (faltaTriar) {
            return;
        }

        let novoStatus: StatusLote;

        if (equipamentos.every((e) => DESTINOS_FINAIS.includes(e.getStatusRastreamento()))) {
            novoStatus = StatusLote.FINALIZADO;
        } else if (equipamentos.some((e) => e.getStatusRastreamento() !== StatusRastreamento.AGUARDANDO_DESMONTE)) {
            novoStatus = StatusLote.ENCAMINHADO;
        } else {
            novoStatus = StatusLote.TRIAGEM_CONCLUIDA;
        }

        if (novoStatus !== lote.getStatusProcessamento()) {
            lote.alterarStatus(novoStatus);
            this.repositorio.salvarEntidade(ARQUIVO_LOTES, lote.paraDados());
        }
    }

    private listarTodos(): Lote[] {
        return this.repositorio.listarEntidades(ARQUIVO_LOTES).map((dados) => Lote.deDados(dados));
    }
}