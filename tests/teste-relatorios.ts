import { rmSync } from "node:fs";
import { CriptografiaArquivo } from "../src/persistencia/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../src/persistencia/RepositorioArquivo.js";
import { ServicoOrganizacao } from "../src/servicos/ServicoOrganizacao.js";
import { ServicoLote } from "../src/servicos/ServicoLote.js";
import { ServicoEquipamento } from "../src/servicos/ServicoEquipamento.js";
import { ServicoParametros } from "../src/servicos/ServicoParametros.js";
import { ServicoRelatorio } from "../src/servicos/ServicoRelatorio.js";
import { TipoEquipamento } from "../src/enums/TipoEquipamento.js";
import { EstadoFisico } from "../src/enums/EstadoFisico.js";
import { StatusRastreamento } from "../src/enums/StatusRastreamento.js";

function data(texto: string): Date {
    return new Date(`${texto}T00:00:00`);
}

function diasAtras(dias: number): Date {
    const resultado = new Date();
    resultado.setHours(0, 0, 0, 0);
    resultado.setDate(resultado.getDate() - dias);
    return resultado;
}

function dadosOrganizacao(razaoSocial: string, cnpj: string): any {
    return {
        razaoSocial: razaoSocial,
        cnpj: cnpj,
        inscricaoEstadual: "123.456.789.000",
        enderecoCompleto: "Av. Paulista, 1000, São Paulo - SP",
        telefone: "(11) 3333-4444",
        email: "contato@exemplo.com.br"
    };
}

rmSync("data-teste", { recursive: true, force: true });

const chave = new CriptografiaArquivo().gerarChave();
const repositorio = new RepositorioArquivo("data-teste", chave);
const organizacoes = new ServicoOrganizacao(repositorio);
const equipamentos = new ServicoEquipamento(repositorio);
const lotes = new ServicoLote(repositorio, organizacoes, equipamentos);
const parametros = new ServicoParametros(repositorio);
const relatorio = new ServicoRelatorio(organizacoes, lotes, equipamentos, parametros);

organizacoes.cadastrarOrganizacao(dadosOrganizacao("Banco Exemplo", "11.222.333/0001-81"));
organizacoes.cadastrarOrganizacao(dadosOrganizacao("Hospital Exemplo", "12.ABC.345/01DE-35"));

organizacoes.registrarContrato("BR001", { dataAssinatura: data("2026-01-01"), dataVencimento: data("2026-12-31"), clausulas: ["Coleta mensal"], valorMensal: 1000, renovacaoAutomatica: false });
organizacoes.registrarContrato("BR001", { dataAssinatura: data("2026-06-01"), dataVencimento: data("2027-12-31"), clausulas: ["Coleta quinzenal"], valorMensal: 1500, renovacaoAutomatica: true });
organizacoes.registrarContrato("BR002", { dataAssinatura: data("2026-01-01"), dataVencimento: data("2026-12-31"), clausulas: ["Coleta mensal"], valorMensal: 600, renovacaoAutomatica: false });

parametros.alterarAliquota(10);

console.log("=== 1. Histórico de contratos do BR001 ===");
for (const item of organizacoes.listarContratosDaOrganizacao("BR001")) {
    console.log(`  ${item.contrato.getId()} ${item.atual ? "(atual)" : "(anterior)"} até ${item.fimEfetivo.toLocaleDateString("pt-BR")}`);
}

console.log("");
console.log("=== 2. Financeiro de 01/05/2026 a 30/06/2026 ===");
console.log(relatorio.gerarRelatorioFinanceiro({ inicio: data("2026-05-01"), fim: data("2026-06-30") }));

lotes.criarLote({ organizacaoId: "BR001", notaFiscal: "123", transportadora: "TransRapida", dataEntrada: diasAtras(2), observacoes: "" });
lotes.adicionarEquipamentoLote("LT001", { tipo: TipoEquipamento.NOTEBOOK, marca: "Dell", modelo: "Latitude", anoFabricacao: 2020, pesoQuilogramas: 2.5, estadoFisico: EstadoFisico.BOM_ESTADO }, "gestor");
lotes.adicionarEquipamentoLote("LT001", { tipo: TipoEquipamento.MONITOR, marca: "LG", modelo: "24MK", anoFabricacao: 2021, pesoQuilogramas: 4, estadoFisico: EstadoFisico.NOVO }, "gestor");
lotes.processarTriagem("LT001", "gestor");
lotes.avaliarEquipamento("NOT-000001", EstadoFisico.BOM_ESTADO, "", "gestor");

console.log("");
console.log("=== 3. Por organização, últimos 30 dias ===");
console.log(relatorio.gerarRelatorioPorOrganizacao("BR001", { inicio: diasAtras(30), fim: diasAtras(0) }));

console.log("");
console.log("=== 4. Por status: AGUARDANDO_DESMONTE ===");
console.log(relatorio.gerarRelatorioPorStatus(StatusRastreamento.AGUARDANDO_DESMONTE));

rmSync("data-teste", { recursive: true, force: true });