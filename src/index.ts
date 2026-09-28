import { createInterface } from "node:readline/promises";
import { obterChaveMestra, PASTA_DADOS } from "./cli/provisionamento.js";
import { RepositorioArquivo } from "./persistencia/RepositorioArquivo.js";
import { ServicoAutenticacao } from "./servicos/ServicoAutenticacao.js";
import { ServicoOrganizacao } from "./servicos/ServicoOrganizacao.js";
import { CLIInterface } from "./cli/CLIInterface.js";

const terminal = createInterface({
    input: process.stdin,
    output: process.stdout
});

const chave = await obterChaveMestra(terminal);

const repositorio = new RepositorioArquivo(PASTA_DADOS, chave);
const autenticacao = new ServicoAutenticacao(repositorio);
const organizacao = new ServicoOrganizacao(repositorio);

const cli = new CLIInterface(autenticacao, organizacao, terminal);
await cli.iniciarLoop();