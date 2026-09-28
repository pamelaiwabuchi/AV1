import { rmSync } from "node:fs";
import { CriptografiaArquivo } from "../src/persistencia/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../src/persistencia/RepositorioArquivo.js";
import { ServicoOrganizacao } from "../src/servicos/ServicoOrganizacao.js";
import { converterData, converterValor, formatarData, formatarValor } from "../src/cli/conversores.js";

function tentar(descricao: string, acao: () => void): void {
    try {
        acao();
        console.log(`${descricao}: OK`);
    } catch (erro) {
        console.log(`${descricao}: ${(erro as Error).message}`);
    }
}

console.log("--- Conversores ---");
console.log("1. '31/12/2027':", converterData("31/12/2027")?.toLocaleDateString("pt-BR"));
console.log("2. '31/02/2027' (dia que não existe):", converterData("31/02/2027"));
console.log("3. '2027-12-31' (formato errado):", converterData("2027-12-31"));
console.log("4. '1500,50':", converterValor("1500,50"));
console.log("5. '1.500,50':", converterValor("1.500,50"));
console.log("6. '0':", converterValor("0"));
console.log("7. '-10':", converterValor("-10"));
console.log("8. 'abc':", converterValor("abc"));
console.log("9. Formatado:", formatarValor(1500.5));

console.log("--- Contratos ---");
rmSync("data-teste", { recursive: true, force: true });

const chave = new CriptografiaArquivo().gerarChave();
const repositorio = new RepositorioArquivo("data-teste", chave);
const servico = new ServicoOrganizacao(repositorio);

servico.cadastrarOrganizacao({
    razaoSocial: "Banco Exemplo S.A.",
    cnpj: "11.222.333/0001-81",
    inscricaoEstadual: "123.456.789.000",
    enderecoCompleto: "Av. Paulista, 1000, São Paulo - SP",
    telefone: "(11) 3333-4444",
    email: "ti@bancoexemplo.com.br"
});

const assinatura = converterData("01/01/2026")!;
const vencimento = converterData("31/12/2026")!;

const contrato1 = servico.registrarContrato("BR001", {
    dataAssinatura: assinatura,
    dataVencimento: vencimento,
    clausulas: ["Coleta mensal", "Relatório trimestral"],
    valorMensal: 1500,
    renovacaoAutomatica: true
});
console.log("10. Registrado:", contrato1.getId());

tentar("11. Vencimento antes da assinatura", () => {
    servico.registrarContrato("BR001", { dataAssinatura: vencimento, dataVencimento: assinatura, clausulas: ["X"], valorMensal: 0, renovacaoAutomatica: false });
});

tentar("12. Sem cláusulas", () => {
    servico.registrarContrato("BR001", { dataAssinatura: assinatura, dataVencimento: vencimento, clausulas: [], valorMensal: 0, renovacaoAutomatica: false });
});

tentar("13. Organização que não existe", () => {
    servico.registrarContrato("BR999", { dataAssinatura: assinatura, dataVencimento: vencimento, clausulas: ["X"], valorMensal: 0, renovacaoAutomatica: false });
});

const contrato2 = servico.registrarContrato("BR001", {
    dataAssinatura: converterData("01/01/2027")!,
    dataVencimento: converterData("31/12/2027")!,
    clausulas: ["Coleta quinzenal"],
    valorMensal: 0,
    renovacaoAutomatica: false
});
console.log("14. Substituído por:", contrato2.getId(), "| valor:", formatarValor(contrato2.getValorMensal()));

servico.renovarContrato("BR001", converterData("30/06/2028")!);
const reiniciado = new ServicoOrganizacao(repositorio);
const salvo = reiniciado.buscarOrganizacao("BR001").getContratoVigente()!;
console.log("15. Depois de renovar e reiniciar:", salvo.getId(), "vence em", formatarData(salvo.getDataVencimento()), "| cláusulas:", salvo.getClausulas());

rmSync("data-teste", { recursive: true, force: true });