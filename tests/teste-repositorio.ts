import { rmSync } from "node:fs";
import { CriptografiaArquivo } from "../src/persistencia/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../src/persistencia/RepositorioArquivo.js";
import { conferir, mostrarResultado } from "./conferencia.js";

rmSync("data-teste", { recursive: true, force: true });

const chave = new CriptografiaArquivo().gerarChave();
const repositorio = new RepositorioArquivo("data-teste", chave);

repositorio.salvarEntidade("organizacoes.json", { id: "BR001", nome: "Banco Exemplo" });
repositorio.salvarEntidade("organizacoes.json", { id: "BR002", nome: "Hospital Exemplo" });
conferir("1. Depois de salvar duas, a lista tem as duas", repositorio.listarEntidades("organizacoes.json"), [
    { id: "BR001", nome: "Banco Exemplo" },
    { id: "BR002", nome: "Hospital Exemplo" }
]);

repositorio.salvarEntidade("organizacoes.json", { id: "BR001", nome: "Banco Exemplo S.A." });
conferir("2. Salvar com um id que já existe altera, em vez de duplicar", repositorio.listarEntidades("organizacoes.json"), [
    { id: "BR001", nome: "Banco Exemplo S.A." },
    { id: "BR002", nome: "Hospital Exemplo" }
]);

conferir("3. Buscar a BR002 devolve a BR002", repositorio.carregarEntidade("organizacoes.json", "BR002"), { id: "BR002", nome: "Hospital Exemplo" });
conferir("4. Buscar uma que não existe devolve null", repositorio.carregarEntidade("organizacoes.json", "XX999"), null);

repositorio.excluirEntidade("organizacoes.json", "BR002");
conferir("5. Depois de excluir a BR002, sobra só a BR001", repositorio.listarEntidades("organizacoes.json"), [
    { id: "BR001", nome: "Banco Exemplo S.A." }
]);

conferir("6. Um arquivo que ainda não existe devolve uma lista vazia", repositorio.listarEntidades("lotes.json"), []);

const outraChave = new CriptografiaArquivo().gerarChave();
const repositorioComOutraChave = new RepositorioArquivo("data-teste", outraChave);
let recusou = false;

try {
    repositorioComOutraChave.listarEntidades("organizacoes.json");
} catch {
    recusou = true;
}

conferir("7. Ler os arquivos com outra chave é recusado", recusou, true);

rmSync("data-teste", { recursive: true, force: true });

mostrarResultado();