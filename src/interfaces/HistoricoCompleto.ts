import type { Equipamento } from "../entidades/Equipamento.js";
import type { Movimentacao } from "../entidades/Movimentacao.js";

export interface HistoricoCompleto {
    equipamento: Equipamento;
    movimentacoes: Movimentacao[];
}