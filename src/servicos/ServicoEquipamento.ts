import { RepositorioArquivo } from "../persistencia/RepositorioArquivo.js";
import { Equipamento } from "../entidades/Equipamento.js";
import { TipoEquipamento } from "../enums/TipoEquipamento.js";
import { EstadoFisico } from "../enums/EstadoFisico.js";
import { StatusRastreamento } from "../enums/StatusRastreamento.js";
import type { HistoricoCompleto } from "../interfaces/HistoricoCompleto.js";

const ARQUIVO_EQUIPAMENTOS = "equipamentos.json";

export const DESTINOS_FINAIS: StatusRastreamento[] = [
    StatusRastreamento.PECAS_REAPROVEITADAS,
    StatusRastreamento.MATERIAL_RECICLAVEL,
    StatusRastreamento.DESCARTE_SEGURO,
    StatusRastreamento.BAIXA_DEFINITIVA
];

export class ServicoEquipamento {
    private readonly repositorio: RepositorioArquivo;

    constructor(repositorio: RepositorioArquivo) {
        this.repositorio = repositorio;
    }

    cadastrarEquipamento(loteId: string, posicaoNoLote: number, statusInicial: StatusRastreamento, dados: any, responsavel: string): Equipamento {
        const marca = dados.marca.trim();
        const modelo = dados.modelo.trim();
        const anoAtual = new Date().getFullYear();

        if (marca === "") {
            throw new Error("A marca é obrigatória.");
        }

        if (modelo === "") {
            throw new Error("O modelo é obrigatório.");
        }

        if (!Number.isInteger(dados.anoFabricacao) || dados.anoFabricacao > anoAtual) {
            throw new Error(`O ano de fabricação precisa ser um número inteiro e não pode ser maior que ${anoAtual}.`);
        }

        if (!(dados.pesoQuilogramas > 0)) {
            throw new Error("O peso precisa ser maior que zero.");
        }

        const todos = this.listarTodos();
        const sequencia = todos.length + 1;

        const equipamento = new Equipamento(
            "EQ" + String(sequencia).padStart(3, "0"),
            this.gerarCodigoBarras(dados.tipo, sequencia),
            dados.tipo,
            marca,
            modelo,
            dados.anoFabricacao,
            dados.estadoFisico,
            dados.pesoQuilogramas,
            loteId,
            posicaoNoLote,
            statusInicial,
            []
        );

        equipamento.registrarMovimentacao(statusInicial, responsavel, "", `Entrada no lote ${loteId} com estado declarado ${dados.estadoFisico}`);
        this.salvar(equipamento);

        return equipamento;
    }

    atualizarEstadoFisico(id: string, novoEstado: EstadoFisico, justificativa: string, responsavel: string): Equipamento {
        const equipamento = this.buscarEquipamento(id);

        equipamento.avaliarEstadoFisico(novoEstado, justificativa, responsavel);

        if (equipamento.getStatusRastreamento() === StatusRastreamento.EM_TRIAGEM) {
            equipamento.atualizarStatus(StatusRastreamento.AGUARDANDO_DESMONTE, "Triagem concluída", responsavel);
        }

        this.salvar(equipamento);

        return equipamento;
    }

    destinosPermitidos(statusAtual: StatusRastreamento): StatusRastreamento[] {
        if (statusAtual === StatusRastreamento.AGUARDANDO_DESMONTE) {
            return [StatusRastreamento.EM_DESMONTE, ...DESTINOS_FINAIS];
        }

        if (statusAtual === StatusRastreamento.EM_DESMONTE) {
            return DESTINOS_FINAIS;
        }

        return [];
    }

    movimentarEquipamento(codigo: string, novoStatus: StatusRastreamento, justificativa: string, responsavel: string): Equipamento {
        const equipamento = this.buscarEquipamento(codigo);
        const permitidos = this.destinosPermitidos(equipamento.getStatusRastreamento());

        if (!permitidos.includes(novoStatus)) {
            throw new Error(
                `O equipamento ${equipamento.getCodigoBarrasInterno()} está em ${equipamento.getStatusRastreamento()} ` +
                `e não pode ir para ${novoStatus}.`
            );
        }

        if (justificativa.trim() === "") {
            throw new Error("A justificativa é obrigatória para movimentar o equipamento.");
        }

        equipamento.atualizarStatus(novoStatus, justificativa.trim(), responsavel);
        this.salvar(equipamento);

        return equipamento;
    }

    rastrearEquipamento(id: string): HistoricoCompleto {
        const equipamento = this.buscarEquipamento(id);

        return {
            equipamento: equipamento,
            movimentacoes: equipamento.getHistoricoMovimentacao()
        };
    }

    gerarCodigoBarras(tipo: TipoEquipamento, sequencia: number): string {
        return tipo.slice(0, 3) + "-" + String(sequencia).padStart(6, "0");
    }

    buscarEquipamento(codigo: string): Equipamento {
        const procurado = codigo.trim().toUpperCase();
        const encontrado = this.listarTodos().find((e) => e.getId() === procurado || e.getCodigoBarrasInterno() === procurado);

        if (encontrado === undefined) {
            throw new Error(`Equipamento "${codigo}" não encontrado.`);
        }

        return encontrado;
    }

    listarPorLote(loteId: string): Equipamento[] {
        return this.listarTodos().filter((e) => e.getLoteId() === loteId);
    }

    salvar(equipamento: Equipamento): void {
        this.repositorio.salvarEntidade(ARQUIVO_EQUIPAMENTOS, equipamento.paraDados());
    }

    private listarTodos(): Equipamento[] {
        return this.repositorio.listarEntidades(ARQUIVO_EQUIPAMENTOS).map((dados) => Equipamento.deDados(dados));
    }
}