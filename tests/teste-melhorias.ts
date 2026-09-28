import { rmSync } from "node:fs";
import { CriptografiaArquivo } from "../src/persistencia/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../src/persistencia/RepositorioArquivo.js";
import { ServicoOrganizacao } from "../src/servicos/ServicoOrganizacao.js";

function tentar(descricao: string, acao: () => void): void {
    try {
        acao();
        console.log(`${descricao}: OK`);
    } catch (e) {
        console.log(`${descricao}: ${(e as Error).message}`);
    }
}

function dadosOrganizacao(telefone: string, email: string): any {
    return {
        razaoSocial: "Banco Exemplo",
        cnpj: "11.222.333/0001-81",
        inscricaoEstadual: "123.456.789.000",
        enderecoCompleto: "Av. Paulista, 1000, São Paulo - SP",
        telefone: telefone,
        email: email
    };
}

rmSync("data-teste", { recursive: true, force: true });

const chave = new CriptografiaArquivo().gerarChave();
const repositorio = new RepositorioArquivo("data-teste", chave);
const organizacoes = new ServicoOrganizacao(repositorio);

console.log("--- Telefone ---");
console.log("1. (11) 3333-4444 (fixo com DDD):", organizacoes.verificarTelefone("(11) 3333-4444") ?? "válido");
console.log("2. 11988887777 (celular com DDD):", organizacoes.verificarTelefone("11988887777") ?? "válido");
console.log("3. 3333-4444 (sem DDD):", organizacoes.verificarTelefone("3333-4444") ?? "válido");
console.log("4. vazio:", organizacoes.verificarTelefone("") ?? "válido");

console.log("--- E-mail ---");
console.log("5. contato@banco.com.br:", organizacoes.verificarEmail("contato@banco.com.br") ?? "válido");
console.log("6. contato.banco.com (sem @):", organizacoes.verificarEmail("contato.banco.com") ?? "válido");
console.log("7. contato@banco (sem ponto no domínio):", organizacoes.verificarEmail("contato@banco") ?? "válido");
console.log("8. vazio:", organizacoes.verificarEmail("") ?? "válido");

console.log("--- Cadastro completo ---");
tentar("9. Cadastrar com telefone sem DDD", () => {
    organizacoes.cadastrarOrganizacao(dadosOrganizacao("3333-4444", "contato@exemplo.com.br"));
});
tentar("10. Cadastrar com e-mail inválido", () => {
    organizacoes.cadastrarOrganizacao(dadosOrganizacao("(11) 3333-4444", "contato.exemplo.com.br"));
});
tentar("11. Cadastrar com telefone e e-mail válidos", () => {
    organizacoes.cadastrarOrganizacao(dadosOrganizacao("(11) 3333-4444", "contato@exemplo.com.br"));
});

rmSync("data-teste", { recursive: true, force: true });