import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { rmSync } from "node:fs";

const PASTA_DA_JORNADA = "data-jornada";
const TEMPO_MAXIMO_MS = 15000;

let passosCertos = 0;
let passosErrados = 0;

function formatarData(data: Date): string {
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    return `${dia}/${mes}/${data.getFullYear()}`;
}

function diasAPartirDeHoje(dias: number): string {
    const data = new Date();
    data.setDate(data.getDate() + dias);
    return formatarData(data);
}

class SistemaEmTeste {
    private processo: ChildProcessWithoutNullStreams;
    private saida: string;
    private posicaoLida: number;
    private readonly terminou: Promise<unknown>;

    constructor() {
        this.saida = "";
        this.posicaoLida = 0;

        this.processo = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
            env: { ...process.env, GREENCODE_DADOS: PASTA_DA_JORNADA }
        });

        this.processo.stdout.on("data", (pedaco) => {
            this.saida = this.saida + pedaco.toString();
        });

        this.processo.stderr.on("data", (pedaco) => {
            this.saida = this.saida + pedaco.toString();
        });

        this.terminou = new Promise((resolver) => {
            this.processo.on("exit", resolver);
        });
    }

    async esperar(texto: string): Promise<boolean> {
        const inicio = Date.now();

        while (Date.now() - inicio < TEMPO_MAXIMO_MS) {
            const posicao = this.saida.indexOf(texto, this.posicaoLida);

            if (posicao !== -1) {
                this.posicaoLida = posicao + texto.length;
                return true;
            }

            await new Promise((resolver) => setTimeout(resolver, 50));
        }

        return false;
    }

    digitar(texto: string): void {
        this.processo.stdin.write(texto + "\n");
    }

    async responder(pergunta: string, resposta: string): Promise<void> {
        const apareceu = await this.esperar(pergunta);

        if (!apareceu) {
            throw new Error(`A pergunta "${pergunta}" não apareceu.`);
        }

        this.digitar(resposta);
    }

    async conferir(descricao: string, textoEsperado: string): Promise<void> {
        const apareceu = await this.esperar(textoEsperado);

        if (apareceu) {
            passosCertos = passosCertos + 1;
            console.log(`  [OK]   ${descricao}`);
        } else {
            passosErrados = passosErrados + 1;
            console.log(`  [FALHOU] ${descricao} (esperava ver: "${textoEsperado}")`);
        }
    }

    async entrar(usuario: string, senha: string): Promise<void> {
        await this.responder("Usuário: ", usuario);
        await this.responder("Senha: ", senha);
        await this.conferir(`Login de ${usuario}`, `Bem-vindo(a), ${usuario}!`);
    }

    async comando(texto: string): Promise<void> {
        await this.responder("Opção ou comando: ", texto);
    }

    async encerrar(): Promise<void> {
        await this.comando("sair");
        await this.esperar("Até logo!");
        await this.terminou;
    }
}

async function etapaProvisionamento(): Promise<void> {
    console.log("\n1. Provisionamento e administrador");
    const sistema = new SistemaEmTeste();

    await sistema.responder("Defina a senha do administrador: ", "admin123");
    await sistema.responder("Confirme a senha: ", "admin123");
    await sistema.conferir("Sistema provisionado", "Provisionamento concluído");

    await sistema.entrar("admin", "admin123");

    await sistema.comando("usuario criar");
    await sistema.responder("Nome do novo usuário: ", "operador1");
    await sistema.responder("Senha: ", "op123");
    await sistema.responder("Opção: ", "2");
    await sistema.conferir("Operador de cadastro criado", "cadastrado como OPERADOR_CADASTRO");

    await sistema.comando("usuario criar");
    await sistema.responder("Nome do novo usuário: ", "gestor1");
    await sistema.responder("Senha: ", "ge123");
    await sistema.responder("Opção: ", "3");
    await sistema.conferir("Gestor de almoxarifado criado", "cadastrado como GESTOR_ALMOXARIFADO");

    await sistema.comando("usuario criar");
    await sistema.responder("Nome do novo usuário: ", "auditor1");
    await sistema.responder("Senha: ", "au123");
    await sistema.responder("Opção: ", "4");
    await sistema.conferir("Auditor criado", "cadastrado como AUDITOR");

    await sistema.comando("parametros aliquota");
    await sistema.responder("Nova alíquota", "10");
    await sistema.conferir("Alíquota de impostos configurada", "Alíquota alterada para 10%");

    await sistema.encerrar();
}

async function etapaOperador(): Promise<void> {
    console.log("\n2. Operador de cadastro: organização e contrato");
    const sistema = new SistemaEmTeste();

    await sistema.entrar("operador1", "op123");

    await sistema.comando("organizacao criar");
    await sistema.responder("Razão social: ", "Banco Exemplo S.A.");
    await sistema.responder("CNPJ: ", "11.222.333/0001-81");
    await sistema.responder("Inscrição estadual: ", "123.456.789.000");
    await sistema.responder("Endereço completo: ", "Av. Paulista, 1000, São Paulo - SP");
    await sistema.responder("Telefone com DDD: ", "(11) 3333-4444");
    await sistema.responder("E-mail: ", "ti@bancoexemplo.com.br");
    await sistema.conferir("Organização cadastrada", "Organização cadastrada com o código BR001");

    await sistema.comando("contrato criar --org BR001");
    await sistema.responder("Data de assinatura", diasAPartirDeHoje(-30));
    await sistema.responder("Data de vencimento", diasAPartirDeHoje(365));
    await sistema.responder("Cláusula 1: ", "Coleta mensal de equipamentos");
    await sistema.responder("Cláusula 2: ", "");
    await sistema.responder("Valor mensal", "1500,00");
    await sistema.responder("Renovação automática? (S/N): ", "S");
    await sistema.conferir("Contrato registrado", "Contrato CT001 registrado para a organização BR001");

    await sistema.comando("lote criar");
    await sistema.conferir("Operador não pode registrar lote (permissão)", "Você não tem permissão");

    await sistema.encerrar();
}

async function etapaGestor(): Promise<void> {
    console.log("\n3. Gestor de almoxarifado: lote, triagem e movimentações");
    const sistema = new SistemaEmTeste();

    await sistema.entrar("gestor1", "ge123");

    await sistema.comando("lote criar --org BR001 --nf 12345 --transp TransRapida");
    await sistema.responder("ou digite a data", "1");
    await sistema.responder("Observações", "");
    await sistema.conferir("Lote registrado", "Lote LT001 registrado com status RECEBIDO");

    await sistema.comando("equipamento adicionar --lote LT001");
    await sistema.responder("Opção: ", "2");
    await sistema.responder("Marca: ", "Dell");
    await sistema.responder("Modelo: ", "Latitude 5420");
    await sistema.responder("Ano de fabricação", "2020");
    await sistema.responder("Peso em kg", "2,5");
    await sistema.responder("Opção: ", "2");
    await sistema.conferir("Notebook adicionado", "Código de barras: NOT-000001");
    await sistema.responder("Adicionar outro equipamento", "S");
    await sistema.responder("Opção: ", "3");
    await sistema.responder("Marca: ", "LG");
    await sistema.responder("Modelo: ", "24MK430");
    await sistema.responder("Ano de fabricação", "2021");
    await sistema.responder("Peso em kg", "4");
    await sistema.responder("Opção: ", "1");
    await sistema.conferir("Monitor adicionado", "Código de barras: MON-000002");
    await sistema.responder("Adicionar outro equipamento", "N");

    await sistema.comando("triagem iniciar --lote LT001");
    await sistema.conferir("Triagem iniciada", "Triagem do lote LT001 iniciada");

    await sistema.comando("equipamento avaliar --codigo NOT-000001");
    await sistema.responder("Opção: ", "5");
    await sistema.responder("Justificativa: ", "Tela trincada");
    await sistema.conferir("Notebook avaliado com justificativa (caiu 3 categorias)", "Status: AGUARDANDO_DESMONTE");

    await sistema.comando("equipamento avaliar --codigo MON-000002");
    await sistema.responder("Opção: ", "1");
    await sistema.conferir("Monitor avaliado e triagem do lote concluída", "Lote LT001: TRIAGEM_CONCLUIDA");

    await sistema.comando("equipamento movimentar --codigo NOT-000001");
    await sistema.responder("Opção: ", "1");
    await sistema.responder("Justificativa (obrigatória): ", "Tela sem conserto, aproveitar componentes");
    await sistema.conferir("Notebook enviado para desmonte (lote encaminhado)", "Lote LT001: ENCAMINHADO");

    await sistema.comando("equipamento movimentar --codigo NOT-000001");
    await sistema.responder("Opção: ", "2");
    await sistema.responder("Justificativa (obrigatória): ", "Placas e carcaça para reciclagem");
    await sistema.conferir("Notebook com destino final", "movido para MATERIAL_RECICLAVEL");

    await sistema.comando("equipamento movimentar --codigo MON-000002");
    await sistema.responder("Opção: ", "4");
    await sistema.responder("Justificativa (obrigatória): ", "Painel com vazamento");
    await sistema.conferir("Monitor direto para descarte (lote finalizado)", "Lote LT001: FINALIZADO");

    await sistema.encerrar();
}

async function etapaAuditor(): Promise<void> {
    console.log("\n4. Auditor: rastreabilidade, relatório e journal");
    const sistema = new SistemaEmTeste();

    await sistema.entrar("auditor1", "au123");

    await sistema.comando("equipamento movimentar");
    await sistema.conferir("Auditor não pode movimentar (permissão)", "Você não tem permissão");

    await sistema.comando("equipamento rastrear --codigo NOT-000001");
    await sistema.conferir("Rastreabilidade: origem do equipamento", "Organização: BR001 | Lote: LT001");
    await sistema.conferir("Rastreabilidade: entrada no lote", "entrada -> AGUARDANDO_TRIAGEM");
    await sistema.conferir("Rastreabilidade: triagem", "EM_TRIAGEM -> AGUARDANDO_DESMONTE");
    await sistema.conferir("Rastreabilidade: desmonte", "AGUARDANDO_DESMONTE -> EM_DESMONTE");
    await sistema.conferir("Rastreabilidade: destino final", "EM_DESMONTE -> MATERIAL_RECICLAVEL");

    await sistema.comando("relatorio financeiro");
    await sistema.responder("Opção: ", "1");
    await sistema.conferir("Relatório financeiro com a alíquota de 10%", "Alíquota: 10%");
    await sistema.responder("Deseja salvar este relatório", "N");
    await sistema.responder("Opção: ", "0");

    await sistema.comando(`journal consultar --inicio ${diasAPartirDeHoje(0)} --fim ${diasAPartirDeHoje(0)}`);
    await sistema.conferir("Journal registrou a movimentação do gestor", "gestor1 | ALTERAR | equipamentos.json");

    await sistema.encerrar();
}

rmSync(PASTA_DA_JORNADA, { recursive: true, force: true });

console.log("=== Jornada completa do greencode ===");

try {
    await etapaProvisionamento();
    await etapaOperador();
    await etapaGestor();
    await etapaAuditor();
} catch (e) {
    passosErrados = passosErrados + 1;
    console.log(`\n  [FALHOU] A jornada parou: ${(e as Error).message}`);
}

rmSync(PASTA_DA_JORNADA, { recursive: true, force: true });

console.log(`\n=== Resultado: ${passosCertos} passos certos, ${passosErrados} com falha ===`);

if (passosErrados > 0) {
    process.exitCode = 1;
}