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

lotes.adicionarEquipamentoLote("LT001", { tipo: TipoEquipamento.NOTEBOOK, marca: "Dell", modelo: "Latitude", anoFabricacao: 2019, pesoQuilogramas: 2.5, estadoFisico: EstadoFisico.BOM_ESTADO }, "gestor");
lotes.adicionarEquipamentoLote("LT001", { tipo: TipoEquipamento.MONITOR, marca: "LG", modelo: "24MK", anoFabricacao: 2020, pesoQuilogramas: 4, estadoFisico: EstadoFisico.NOVO }, "gestor");

tentar("1. Movimentar antes da triagem", () => {
    lotes.movimentarEquipamento("NOT-000001", StatusRastreamento.EM_DESMONTE, "Teste", "gestor");
});

lotes.processarTriagem("LT001", "gestor");
lotes.avaliarEquipamento("NOT-000001", EstadoFisico.DANIFICADO_LEVE, "Tela trincada", "gestor");
lotes.avaliarEquipamento("MON-000002", EstadoFisico.NOVO, "", "gestor");
console.log("2. Depois da triagem. Lote:", lotes.buscarLote("LT001").getStatusProcessamento());

console.log("3. Destinos permitidos do notebook:", equipamentos.destinosPermitidos(StatusRastreamento.AGUARDANDO_DESMONTE));

tentar("4. Sem justificativa", () => {
    lotes.movimentarEquipamento("NOT-000001", StatusRastreamento.EM_DESMONTE, "  ", "gestor");
});

lotes.movimentarEquipamento("NOT-000001", StatusRastreamento.EM_DESMONTE, "Tela sem conserto, aproveitar componentes", "gestor");
console.log("5. Notebook em desmonte. Lote:", lotes.buscarLote("LT001").getStatusProcessamento());

tentar("6. Notebook de EM_DESMONTE de volta para EM_DESMONTE", () => {
    lotes.movimentarEquipamento("NOT-000001", StatusRastreamento.EM_DESMONTE, "Teste", "gestor");
});

lotes.movimentarEquipamento("MON-000002", StatusRastreamento.PECAS_REAPROVEITADAS, "Monitor novo, reaproveitado inteiro", "gestor");
console.log("7. Monitor direto para destino final. Lote:", lotes.buscarLote("LT001").getStatusProcessamento());

lotes.movimentarEquipamento("NOT-000001", StatusRastreamento.MATERIAL_RECICLAVEL, "Placas e carcaça para reciclagem", "gestor");
console.log("8. Notebook com destino final. Lote:", lotes.buscarLote("LT001").getStatusProcessamento());

tentar("9. Movimentar equipamento já com destino final", () => {
    lotes.movimentarEquipamento("NOT-000001", StatusRastreamento.DESCARTE_SEGURO, "Teste", "gestor");
});

const historico = equipamentos.rastrearEquipamento("NOT-000001");
console.log(`10. Rastreabilidade de ${historico.equipamento.getCodigoBarrasInterno()} (${historico.movimentacoes.length} movimentações):`);
for (const m of historico.movimentacoes) {
    console.log(`    ${m.getOrigem() || "entrada"} -> ${m.getDestino()} | ${m.getObservacao()}`);
}

rmSync("data-teste", { recursive: true, force: true });