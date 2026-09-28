import { CriptografiaArquivo } from "./CriptografiaArquivo.js";
import { RepositorioArquivo } from "./RepositorioArquivo.js";

const chave = new CriptografiaArquivo().gerarChave();
const repositorio = new RepositorioArquivo("data-teste", chave);

repositorio.salvarEntidade("organizacoes.json", { id: "BR001", nome: "Banco Exemplo" });
repositorio.salvarEntidade("organizacoes.json", { id: "BR002", nome: "Hospital Exemplo" });
console.log("1. Depois de salvar duas:", repositorio.listarEntidades("organizacoes.json"));

repositorio.salvarEntidade("organizacoes.json", { id: "BR001", nome: "Banco Exemplo S.A." });
console.log("2. Depois de alterar a BR001:", repositorio.listarEntidades("organizacoes.json"));

console.log("3. Buscando a BR002:", repositorio.carregarEntidade("organizacoes.json", "BR002"));
console.log("4. Buscando uma que não existe:", repositorio.carregarEntidade("organizacoes.json", "XX999"));

repositorio.excluirEntidade("organizacoes.json", "BR002");
console.log("5. Depois de excluir a BR002:", repositorio.listarEntidades("organizacoes.json"));

console.log("6. Arquivo que não existe:", repositorio.listarEntidades("lotes.json"));