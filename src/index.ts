import { createInterface } from "node:readline/promises";
import { obterChaveMestra, PASTA_DADOS } from "./cli/provisionamento.js";
import { RepositorioArquivo } from "./persistencia/RepositorioArquivo.js";
import { ServicoAutenticacao } from "./servicos/ServicoAutenticacao.js";
import { ServicoOrganizacao } from "./servicos/ServicoOrganizacao.js";
import { ServicoLote } from "./servicos/ServicoLote.js";
import { ServicoEquipamento } from "./servicos/ServicoEquipamento.js";
import { ServicoJournal } from "./servicos/ServicoJournal.js";
import { HistoricoComandos } from "./cli/HistoricoComandos.js";
import { CLIInterface } from "./cli/CLIInterface.js";

const historico = new HistoricoComandos(PASTA_DADOS);
let cli: CLIInterface | null = null;

const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
    history: historico.getLinhas(),
    historySize: 200,
    removeHistoryDuplicates: true,
    completer: (linha: string): [string[], string] => {
        if (cli === null) {
            return [[], linha];
        }

        return cli.completar(linha);
    }
});

const chave = await obterChaveMestra(terminal, historico);
historico.carregar(chave);

const journal = new ServicoJournal(PASTA_DADOS, chave);
const repositorio = new RepositorioArquivo(PASTA_DADOS, chave, journal);
const autenticacao = new ServicoAutenticacao(repositorio);
const organizacao = new ServicoOrganizacao(repositorio);
const equipamento = new ServicoEquipamento(repositorio);
const lote = new ServicoLote(repositorio, organizacao, equipamento);

cli = new CLIInterface(autenticacao, organizacao, lote, equipamento, journal, terminal, historico);
await cli.iniciarLoop();