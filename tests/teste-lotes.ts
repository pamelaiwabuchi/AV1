import { rmSync } from "node:fs";
import { CriptografiaArquivo } from "../src/persistencia/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../src/persistencia/RepositorioArquivo.js";
import { ServicoOrganizacao } from "../src/servicos/ServicoOrganizacao.js";
import { ServicoLote } from "../src/servicos/ServicoLote.js";
import { ValidadorDataEntrada } from "../src/validadores/ValidadorDataEntrada.js";

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

console.log("--- ValidadorDataEntrada ---");
const validador = new ValidadorDataEntrada();
console.log("1. Hoje:", validador.validar(diasAtras(0)));
console.log("2. Há 90 dias:", validador.validar(diasAtras(90)));
console.log("3. Há 91 dias:", validador.validar(diasAtras(91)), "-", validador.obterMensagemErro());
console.log("4. Amanhã:", validador.validar(diasAtras(-1)), "-", validador.obterMensagemErro());

console.log("--- Lotes ---");
rmSync("data-teste", { recursive: true, force: true });

const chave = new CriptografiaArquivo().gerarChave();
const repositorio = new RepositorioArquivo("data-teste", chave);
const organizacoes = new ServicoOrganizacao(repositorio);
const lotes = new ServicoLote(repositorio, organizacoes);

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

function contratoValido(): any {
    return {
        dataAssinatura: diasAtras(30),
        dataVencimento: diasAtras(-365),
        clausulas: ["Coleta mensal"],
        valorMensal: 1000,
        renovacaoAutomatica: true
    };
}

organizacoes.cadastrarOrganizacao(dadosOrganizacao("Banco Exemplo", "11.222.333/0001-81"));
organizacoes.cadastrarOrganizacao(dadosOrganizacao("Hospital Exemplo", "12.ABC.345/01DE-35"));
organizacoes.registrarContrato("BR001", contratoValido());

const lote1 = lotes.criarLote({ organizacaoId: "BR001", notaFiscal: "123456", transportadora: "TransRapida", dataEntrada: diasAtras(2), observacoes: "Caixas lacradas" });
console.log("5. Registrado:", lote1.getId(), "status", lote1.getStatusProcessamento());

tentar("6. Organização sem contrato", () => {
    lotes.criarLote({ organizacaoId: "BR002", notaFiscal: "999", transportadora: "TransRapida", dataEntrada: diasAtras(0), observacoes: "" });
});

organizacoes.registrarContrato("BR002", contratoValido());

tentar("7. Mesma nota fiscal na mesma organização", () => {
    lotes.criarLote({ organizacaoId: "BR001", notaFiscal: "123456", transportadora: "TransRapida", dataEntrada: diasAtras(0), observacoes: "" });
});

tentar("8. Mesma nota fiscal em outra organização", () => {
    lotes.criarLote({ organizacaoId: "BR002", notaFiscal: "123456", transportadora: "LogBrasil", dataEntrada: diasAtras(10), observacoes: "" });
});

tentar("9. Data futura", () => {
    lotes.criarLote({ organizacaoId: "BR001", notaFiscal: "777", transportadora: "TransRapida", dataEntrada: diasAtras(-1), observacoes: "" });
});

tentar("10. Data de 100 dias atrás", () => {
    lotes.criarLote({ organizacaoId: "BR001", notaFiscal: "778", transportadora: "TransRapida", dataEntrada: diasAtras(100), observacoes: "" });
});

tentar("11. Sem transportadora", () => {
    lotes.criarLote({ organizacaoId: "BR001", notaFiscal: "779", transportadora: "  ", dataEntrada: diasAtras(0), observacoes: "" });
});

console.log("12. Lotes dos últimos 5 dias:", lotes.consultarLotePorPeriodo(diasAtras(5), diasAtras(0)).map((l) => l.getId()));
console.log("13. Lotes dos últimos 30 dias:", lotes.consultarLotePorPeriodo(diasAtras(30), diasAtras(0)).map((l) => l.getId()));

rmSync("data-teste", { recursive: true, force: true });