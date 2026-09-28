import { rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CriptografiaArquivo } from "../src/persistencia/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../src/persistencia/RepositorioArquivo.js";
import { ServicoJournal } from "../src/servicos/ServicoJournal.js";
import { ServicoOrganizacao } from "../src/servicos/ServicoOrganizacao.js";

function diasAtras(dias: number): Date {
    const data = new Date();
    data.setHours(0, 0, 0, 0);
    data.setDate(data.getDate() - dias);
    return data;
}

rmSync("data-teste", { recursive: true, force: true });

const chave = new CriptografiaArquivo().gerarChave();
const journal = new ServicoJournal("data-teste", chave, 3000);
const repositorio = new RepositorioArquivo("data-teste", chave, journal);
const organizacoes = new ServicoOrganizacao(repositorio);

journal.definirUsuario("admin");
journal.registrar("LOGIN_SUCESSO", "sessao", null, { usuario: "admin" });

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

const transacoes = journal.consultarPorPeriodo(diasAtras(0), diasAtras(0));
console.log(`1. Transações de hoje: ${transacoes.length}`);
for (const t of transacoes) {
    console.log(`   ${t.getUsuarioResponsavel()} | ${t.getOperacao()} | ${t.getEntidade()} | antes: ${t.getDadosAntes() === null ? "nada" : "sim"} | depois: ${t.getDadosDepois() === null ? "nada" : "sim"}`);
}

const primeiraLinha = readFileSync(join("data-teste", "journal", "journal-atual.log"), "utf8").split("\n")[0] ?? "";
console.log("2. Arquivo do journal está legível?", primeiraLinha.includes("admin") ? "SIM (problema!)" : "não, está criptografado");

for (let i = 0; i < 10; i++) {
    journal.registrar("CONSULTA_TESTE", "cli", null, { numero: i });
}
console.log("3. Arquivos depois de passar do limite (3000 bytes neste teste):", journal.listarArquivos());
console.log("4. Transações lidas de todos os arquivos:", journal.consultarPorPeriodo(diasAtras(0), diasAtras(0)).length);

const alteracaoContrato = transacoes.find((t) => t.getOperacao() === "ALTERAR");
if (alteracaoContrato !== undefined) {
    const reverteu = alteracaoContrato.reverter(repositorio);
    const contratoAgora = organizacoes.buscarOrganizacao("BR001").getContratoVigente();
    console.log("5. Reverter o registro do contrato:", reverteu, "| contrato agora:", contratoAgora === null ? "nenhum" : contratoAgora.getId());
}

const login = transacoes.find((t) => t.getOperacao() === "LOGIN_SUCESSO");
if (login !== undefined) {
    console.log("6. Reverter um login (não é dado):", login.reverter(repositorio));
}

const ultima = journal.consultarPorPeriodo(diasAtras(0), diasAtras(0)).at(-1);
console.log("7. A própria reversão também foi registrada:", ultima?.getOperacao(), ultima?.getEntidade());

rmSync("data-teste", { recursive: true, force: true });