import { rmSync } from "node:fs";
import { CriptografiaArquivo } from "../src/persistencia/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../src/persistencia/RepositorioArquivo.js";
import { ServicoOrganizacao } from "../src/servicos/ServicoOrganizacao.js";
import { ServicoLote } from "../src/servicos/ServicoLote.js";
import { ServicoEquipamento } from "../src/servicos/ServicoEquipamento.js";
import { TipoEquipamento } from "../src/enums/TipoEquipamento.js";
import { EstadoFisico } from "../src/enums/EstadoFisico.js";
import { StatusRastreamento } from "../src/enums/StatusRastreamento.js";

function tentar(descricao: string, acao: () => void): void {
    try {
        acao();
        console.log(`${descricao}: OK`);
    } catch (erro) {
        console.log(`${descricao}: ${(erro as Error).message}`);
    }
}

function diasAtras(dias: number): Date {
    const data = new Date();
    data.setHours(0, 0, 0, 0);
    data.setDate(data.getDate() - dias);
    return data;
}

function dadosEquipamento(tipo: TipoEquipamento, marca: string, modelo: string, estado: EstadoFisico): any {
    return { tipo, marca, modelo, anoFabricacao: 2019, pesoQuilogramas: 2.5, estadoFisico: estado };
}

rmSync("data-teste", { recursive: true, force: true });

const chave = new CriptografiaArquivo().gerarChave();
const repositorio = new RepositorioArquivo("data-teste", chave);
const organizacoes = new ServicoOrganizacao(repositorio);
const equipamentos = new ServicoEquipamento(repositorio);
const lotes = new ServicoLote(repositorio, organizacoes, equipamentos);

organizacoes.cadastrarOrganizacao({
    razaoSocial: "Banco Exemplo",
    cnpj: "11.222.333/0001-81",
    inscricaoEstadual: "123.456.789.000",
    enderecoCompleto: "Av. Paulista, 1000, São Paulo - SP",
    telefone: "(11) 3333-4444",
    email: "contato@exemplo.com.br"
});
organizacoes.registrarContrato("BR001", {
    dataAssinatura: diasAtras(30),
    dataVencimento: diasAtras(-365),
    clausulas: ["Coleta mensal"],
    valorMensal: 1000,
    renovacaoAutomatica: true
});
lotes.criarLote({ organizacaoId: "BR001", notaFiscal: "123456", transportadora: "TransRapida", dataEntrada: diasAtras(1), observacoes: "" });

console.log("--- Adicionar equipamentos ---");
tentar("1. Triagem sem equipamentos", () => {
    lotes.processarTriagem("LT001", "gestor");
});

const notebook = lotes.adicionarEquipamentoLote("LT001", dadosEquipamento(TipoEquipamento.NOTEBOOK, "Dell", "Latitude 5490", EstadoFisico.BOM_ESTADO), "gestor");
const monitor = lotes.adicionarEquipamentoLote("LT001", dadosEquipamento(TipoEquipamento.MONITOR, "LG", "24MK430", EstadoFisico.NOVO), "gestor");
console.log("2. Adicionados:", notebook.getCodigoBarrasInterno(), monitor.getCodigoBarrasInterno(), "| status:", notebook.getStatusRastreamento());

tentar("3. Sem marca", () => {
    lotes.adicionarEquipamentoLote("LT001", dadosEquipamento(TipoEquipamento.MONITOR, " ", "X", EstadoFisico.NOVO), "gestor");
});
tentar("4. Ano futuro", () => {
    const dados = dadosEquipamento(TipoEquipamento.MONITOR, "LG", "X", EstadoFisico.NOVO);
    dados.anoFabricacao = new Date().getFullYear() + 1;
    lotes.adicionarEquipamentoLote("LT001", dados, "gestor");
});
tentar("5. Peso zero", () => {
    const dados = dadosEquipamento(TipoEquipamento.MONITOR, "LG", "X", EstadoFisico.NOVO);
    dados.pesoQuilogramas = 0;
    lotes.adicionarEquipamentoLote("LT001", dados, "gestor");
});

console.log("--- Triagem ---");
tentar("6. Avaliar antes de iniciar a triagem", () => {
    lotes.avaliarEquipamento("NOT-000001", EstadoFisico.BOM_ESTADO, "", "gestor");
});

lotes.processarTriagem("LT001", "gestor");
console.log("7. Triagem iniciada. Lote:", lotes.buscarLote("LT001").getStatusProcessamento());

tentar("8. Desmonte antes da triagem completa", () => {
    const eq = equipamentos.buscarEquipamento("NOT-000001");
    eq.atualizarStatus(StatusRastreamento.EM_DESMONTE, "", "gestor");
});

tentar("9. Notebook: BOM_ESTADO -> DANIFICADO_LEVE sem justificativa", () => {
    lotes.avaliarEquipamento("NOT-000001", EstadoFisico.DANIFICADO_LEVE, "", "gestor");
});

const avaliado = lotes.avaliarEquipamento("not-000001", EstadoFisico.DANIFICADO_LEVE, "Tela trincada na chegada", "gestor");
console.log("10. Notebook avaliado:", avaliado.getEstadoFisico(), avaliado.getStatusRastreamento(), "| lote:", lotes.buscarLote("LT001").getStatusProcessamento());

const monitorAvaliado = lotes.avaliarEquipamento("MON-000002", EstadoFisico.BOM_ESTADO, "", "gestor");
console.log("11. Monitor (caiu 1 categoria, sem justificativa):", monitorAvaliado.getStatusRastreamento(), "| lote:", lotes.buscarLote("LT001").getStatusProcessamento());

tentar("12. Adicionar equipamento com a triagem concluída", () => {
    lotes.adicionarEquipamentoLote("LT001", dadosEquipamento(TipoEquipamento.IMPRESSORA, "HP", "LaserJet", EstadoFisico.USADO_LEVE), "gestor");
});

console.log("--- Relatório e histórico ---");
console.log(lotes.buscarLote("LT001").gerarRelatorioTriagem());

console.log("Histórico do notebook:");
for (const m of equipamentos.buscarEquipamento("NOT-000001").getHistoricoMovimentacao()) {
    console.log(`  ${m.getId()} | ${m.getOrigem() || "-"} -> ${m.getDestino()} | ${m.getResponsavel()} | ${m.getObservacao()}`);
}

rmSync("data-teste", { recursive: true, force: true });