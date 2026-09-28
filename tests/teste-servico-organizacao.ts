import { rmSync } from "node:fs";
import { CriptografiaArquivo } from "../src/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../src/RepositorioArquivo.js";
import { ServicoOrganizacao } from "../src/ServicoOrganizacao.js";
import { Contrato } from "../src/entidades/Contrato.js";

rmSync("data-teste", { recursive: true, force: true });

const chave = new CriptografiaArquivo().gerarChave();
const repositorio = new RepositorioArquivo("data-teste", chave);
const servico = new ServicoOrganizacao(repositorio);

function tentar(descricao: string, acao: () => void): void {
    try {
        acao();
        console.log(`${descricao}: OK`);
    } catch (erro) {
        console.log(`${descricao}: ${(erro as Error).message}`);
    }
}

function dadosCompletos(razaoSocial: string, cnpj: string): any {
    return {
        razaoSocial: razaoSocial,
        cnpj: cnpj,
        inscricaoEstadual: "123.456.789.000",
        enderecoCompleto: "Av. Paulista, 1000, São Paulo - SP",
        telefone: "(11) 3333-4444",
        email: "contato@exemplo.com.br"
    };
}

const banco = servico.cadastrarOrganizacao(dadosCompletos("Banco Exemplo S.A.", "11.222.333/0001-81"));
console.log("1. Cadastrada:", banco.getId(), banco.getRazaoSocial(), banco.getCnpj());

const hospital = servico.cadastrarOrganizacao(dadosCompletos("Hospital Exemplo", "12.abc.345/01de-35"));
console.log("2. Cadastrada (CNPJ alfanumérico):", hospital.getId(), hospital.getRazaoSocial(), hospital.getCnpj());

tentar("3. CNPJ com dígito errado", () => {
    servico.cadastrarOrganizacao(dadosCompletos("Loja X", "11.222.333/0001-82"));
});

tentar("4. CNPJ repetido, digitado sem pontuação", () => {
    servico.cadastrarOrganizacao(dadosCompletos("Outro Banco", "11222333000181"));
});

tentar("5. Razão social vazia", () => {
    servico.cadastrarOrganizacao(dadosCompletos("   ", "11.444.777/0001-61"));
});

tentar("6. Inscrição estadual vazia", () => {
    const dados = dadosCompletos("Loja Y", "11.444.777/0001-61");
    dados.inscricaoEstadual = "";
    servico.cadastrarOrganizacao(dados);
});

tentar("7. Endereço vazio", () => {
    const dados = dadosCompletos("Loja Y", "11.444.777/0001-61");
    dados.enderecoCompleto = "";
    servico.cadastrarOrganizacao(dados);
});

tentar("8. Telefone vazio", () => {
    const dados = dadosCompletos("Loja Y", "11.444.777/0001-61");
    dados.telefone = "";
    servico.cadastrarOrganizacao(dados);
});

tentar("9. E-mail vazio", () => {
    const dados = dadosCompletos("Loja Y", "11.444.777/0001-61");
    dados.email = "  ";
    servico.cadastrarOrganizacao(dados);
});

console.log("10. Buscando 'br001':", servico.buscarOrganizacao("br001").getRazaoSocial());

tentar("11. Buscando uma que não existe", () => {
    servico.buscarOrganizacao("BR999");
});

console.log("12. Ativas:", servico.listarOrganizacoesAtivas().map((o) => o.getId()));

tentar("13. Renovar contrato de quem não tem contrato", () => {
    servico.renovarContrato("BR001", new Date("2027-12-31T00:00:00"));
});

const contrato = new Contrato("CT001", "BR001", new Date("2026-01-01T00:00:00"), new Date("2026-12-31T00:00:00"), ["Coleta mensal"], 1500, true);
console.log("14. Contrato de 2026 está vigente hoje?", contrato.estaVigente());
tentar("15. Renovar para uma data anterior", () => {
    contrato.renovar(new Date("2026-06-30T00:00:00"));
});
contrato.renovar(new Date("2027-12-31T00:00:00"));
console.log("16. Novo vencimento:", contrato.getDataVencimento().toLocaleDateString("pt-BR"));

const servicoReiniciado = new ServicoOrganizacao(repositorio);
console.log("17. Depois de reiniciar:", servicoReiniciado.listarOrganizacoesAtivas().map((o) => `${o.getId()} ${o.getRazaoSocial()}`));

rmSync("data-teste", { recursive: true, force: true });