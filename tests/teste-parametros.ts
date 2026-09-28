import { rmSync } from "node:fs";
import { CriptografiaArquivo } from "../src/persistencia/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../src/persistencia/RepositorioArquivo.js";
import { ServicoParametros } from "../src/servicos/ServicoParametros.js";
import { Equipamento } from "../src/entidades/Equipamento.js";
import { TipoEquipamento } from "../src/enums/TipoEquipamento.js";
import { EstadoFisico } from "../src/enums/EstadoFisico.js";
import { StatusRastreamento } from "../src/enums/StatusRastreamento.js";

function tentar(descricao: string, acao: () => void): void {
    try {
        acao();
        console.log(`${descricao}: OK`);
    } catch (e) {
        console.log(`${descricao}: ${(e as Error).message}`);
    }
}

function equipamentoDe(tipo: TipoEquipamento, ano: number): Equipamento {
    return new Equipamento("EQ001", "X-000001", tipo, "Marca", "Modelo", ano, EstadoFisico.BOM_ESTADO, 1, "LT001", 1, StatusRastreamento.AGUARDANDO_TRIAGEM, []);
}

rmSync("data-teste", { recursive: true, force: true });

const chave = new CriptografiaArquivo().gerarChave();
const repositorio = new RepositorioArquivo("data-teste", chave);
const parametros = new ServicoParametros(repositorio);
const anoAtual = new Date().getFullYear();

console.log("--- Valores iniciais ---");
console.log("1. Alíquota:", parametros.obterAliquota());
console.log("2. Coeficientes:", parametros.listarCoeficientes());

console.log("--- Alterações ---");
parametros.alterarAliquota(15.5);
console.log("3. Nova alíquota:", parametros.obterAliquota());
tentar("4. Alíquota de 150%", () => {
    parametros.alterarAliquota(150);
});
parametros.alterarCoeficiente(TipoEquipamento.NOTEBOOK, 25);
console.log("5. Novo coeficiente do notebook:", parametros.obterCoeficiente(TipoEquipamento.NOTEBOOK));
tentar("6. Coeficiente negativo", () => {
    parametros.alterarCoeficiente(TipoEquipamento.MONITOR, -5);
});

const reiniciado = new ServicoParametros(repositorio);
console.log("7. Depois de reiniciar:", reiniciado.obterAliquota(), reiniciado.obterCoeficiente(TipoEquipamento.NOTEBOOK));

console.log("--- Depreciação ---");
console.log(`8. Notebook de ${anoAtual - 4}, taxa 20%:`, equipamentoDe(TipoEquipamento.NOTEBOOK, anoAtual - 4).calcularDepreciacao(20));
console.log(`9. Notebook de ${anoAtual - 7}, taxa 20% (limite de 100%):`, equipamentoDe(TipoEquipamento.NOTEBOOK, anoAtual - 7).calcularDepreciacao(20));
console.log(`10. Impressora de ${anoAtual - 6}, taxa 10%:`, equipamentoDe(TipoEquipamento.IMPRESSORA, anoAtual - 6).calcularDepreciacao(10));
console.log(`11. Monitor de ${anoAtual}, taxa 20% (ainda não tem idade):`, equipamentoDe(TipoEquipamento.MONITOR, anoAtual).calcularDepreciacao(20));

rmSync("data-teste", { recursive: true, force: true });