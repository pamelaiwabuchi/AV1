import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CriptografiaArquivo } from "./persistencia/CriptografiaArquivo.js";
import { RepositorioArquivo } from "./persistencia/RepositorioArquivo.js";
import { ServicoJournal } from "./servicos/ServicoJournal.js";
import { ServicoAutenticacao } from "./servicos/ServicoAutenticacao.js";
import { ServicoOrganizacao } from "./servicos/ServicoOrganizacao.js";
import { ServicoEquipamento } from "./servicos/ServicoEquipamento.js";
import { ServicoLote } from "./servicos/ServicoLote.js";
import { ServicoParametros } from "./servicos/ServicoParametros.js";
import { PapelUsuario } from "./enums/PapelUsuario.js";
import { TipoEquipamento } from "./enums/TipoEquipamento.js";
import { EstadoFisico } from "./enums/EstadoFisico.js";
import { StatusRastreamento } from "./enums/StatusRastreamento.js";

const PASTA_DEMO = "data-demo";

function diasAPartirDeHoje(dias: number): Date {
    const data = new Date();
    data.setHours(0, 0, 0, 0);
    data.setDate(data.getDate() + dias);
    return data;
}

function dadosOrganizacao(razaoSocial: string, cnpj: string, endereco: string, telefone: string, email: string): any {
    return {
        razaoSocial: razaoSocial,
        cnpj: cnpj,
        inscricaoEstadual: "15.123.456-7",
        enderecoCompleto: endereco,
        telefone: telefone,
        email: email
    };
}

function dadosEquipamento(tipo: TipoEquipamento, marca: string, modelo: string, ano: number, peso: number, estado: EstadoFisico): any {
    return {
        tipo: tipo,
        marca: marca,
        modelo: modelo,
        anoFabricacao: ano,
        pesoQuilogramas: peso,
        estadoFisico: estado
    };
}

function criarDadosDeExemplo(): void {
    console.log(`Criando os dados de demonstração na pasta "${PASTA_DEMO}"...`);

    const chave = new CriptografiaArquivo().gerarChave();
    const journal = new ServicoJournal(PASTA_DEMO, chave);
    const repositorio = new RepositorioArquivo(PASTA_DEMO, chave, journal);
    const autenticacao = new ServicoAutenticacao(repositorio);
    const organizacoes = new ServicoOrganizacao(repositorio);
    const equipamentos = new ServicoEquipamento(repositorio);
    const lotes = new ServicoLote(repositorio, organizacoes, equipamentos);
    const parametros = new ServicoParametros(repositorio);

    journal.definirUsuario("demonstracao");
    journal.registrar("PROVISIONAMENTO", "sistema", null, { administrador: "admin" });

    autenticacao.cadastrarUsuario("admin", "admin123", PapelUsuario.ADMINISTRADOR);
    autenticacao.cadastrarUsuario("operador1", "operador123", PapelUsuario.OPERADOR_CADASTRO);
    autenticacao.cadastrarUsuario("gestor1", "gestor123", PapelUsuario.GESTOR_ALMOXARIFADO);
    autenticacao.cadastrarUsuario("auditor1", "auditor123", PapelUsuario.AUDITOR);

    journal.definirUsuario("admin");
    parametros.alterarAliquota(10);
    parametros.alterarCoeficiente(TipoEquipamento.MONITOR, 25);

    journal.definirUsuario("operador1");

    organizacoes.cadastrarOrganizacao(dadosOrganizacao(
        "Açaí Digital Belém Ltda", "45.279.361/0001-57",
        "Av. Presidente Vargas, 800, Belém - PA", "(91) 3222-1000", "ti@acaidigital.com.br"
    ));
    organizacoes.cadastrarOrganizacao(dadosOrganizacao(
        "Hospital Ver-o-Peso S.A.", "73.551.824/0001-23",
        "Av. Boulevard Castilhos França, 27, Belém - PA", "(91) 3242-2000", "patrimonio@hospitalveropeso.com.br"
    ));
    organizacoes.cadastrarOrganizacao(dadosOrganizacao(
        "Cooperativa Marajó Tech", "06.894.732/0001-59",
        "Rua Primeira, 150, Soure - PA", "(91) 3741-3000", "contato@marajotech.com.br"
    ));
    organizacoes.cadastrarOrganizacao(dadosOrganizacao(
        "Tacacá Sistemas Ltda", "AB.12C.D34/0001-84",
        "Tv. Quintino Bocaiúva, 1500, Belém - PA", "(91) 98800-4000", "suporte@tacacasistemas.com.br"
    ));

    organizacoes.registrarContrato("BR001", {
        dataAssinatura: diasAPartirDeHoje(-200),
        dataVencimento: diasAPartirDeHoje(165),
        clausulas: ["Coleta mensal de equipamentos", "Laudo de descarte por lote"],
        valorMensal: 2000,
        renovacaoAutomatica: false
    });
    organizacoes.registrarContrato("BR001", {
        dataAssinatura: diasAPartirDeHoje(-60),
        dataVencimento: diasAPartirDeHoje(365),
        clausulas: ["Coleta quinzenal de equipamentos", "Laudo de descarte por lote", "Relatório mensal de reciclagem"],
        valorMensal: 2500,
        renovacaoAutomatica: true
    });
    organizacoes.registrarContrato("BR002", {
        dataAssinatura: diasAPartirDeHoje(-100),
        dataVencimento: diasAPartirDeHoje(265),
        clausulas: ["Coleta mensal de equipamentos hospitalares de TI"],
        valorMensal: 1800,
        renovacaoAutomatica: true
    });
    organizacoes.registrarContrato("BR004", {
        dataAssinatura: diasAPartirDeHoje(-30),
        dataVencimento: diasAPartirDeHoje(335),
        clausulas: ["Coleta sob demanda"],
        valorMensal: 950,
        renovacaoAutomatica: false
    });

    journal.definirUsuario("gestor1");

    lotes.criarLote({ organizacaoId: "BR001", notaFiscal: "1001", transportadora: "Transportes Guamá", dataEntrada: diasAPartirDeHoje(-20), observacoes: "" });
    lotes.adicionarEquipamentoLote("LT001", dadosEquipamento(TipoEquipamento.NOTEBOOK, "Dell", "Latitude 5420", 2020, 2.5, EstadoFisico.BOM_ESTADO), "gestor1");
    lotes.adicionarEquipamentoLote("LT001", dadosEquipamento(TipoEquipamento.MONITOR, "LG", "24MK430", 2021, 4, EstadoFisico.NOVO), "gestor1");
    lotes.processarTriagem("LT001", "gestor1");
    lotes.avaliarEquipamento("NOT-000001", EstadoFisico.DANIFICADO_LEVE, "Tela trincada", "gestor1");
    lotes.avaliarEquipamento("MON-000002", EstadoFisico.NOVO, "", "gestor1");
    lotes.movimentarEquipamento("NOT-000001", StatusRastreamento.EM_DESMONTE, "Tela sem conserto, aproveitar componentes", "gestor1");
    lotes.movimentarEquipamento("NOT-000001", StatusRastreamento.MATERIAL_RECICLAVEL, "Placas e carcaça para reciclagem", "gestor1");
    lotes.movimentarEquipamento("MON-000002", StatusRastreamento.PECAS_REAPROVEITADAS, "Monitor em perfeito estado, doado para reuso", "gestor1");

    lotes.criarLote({ organizacaoId: "BR002", notaFiscal: "2001", transportadora: "Logística Icoaraci", dataEntrada: diasAPartirDeHoje(-10), observacoes: "Caixas lacradas" });
    lotes.adicionarEquipamentoLote("LT002", dadosEquipamento(TipoEquipamento.SERVIDOR, "HP", "ProLiant DL380", 2017, 22, EstadoFisico.USADO_MODERADO), "gestor1");
    lotes.adicionarEquipamentoLote("LT002", dadosEquipamento(TipoEquipamento.IMPRESSORA, "Epson", "L3250", 2019, 4, EstadoFisico.USADO_LEVE), "gestor1");
    lotes.processarTriagem("LT002", "gestor1");
    lotes.avaliarEquipamento("SER-000003", EstadoFisico.USADO_MODERADO, "", "gestor1");
    lotes.avaliarEquipamento("IMP-000004", EstadoFisico.USADO_MODERADO, "", "gestor1");
    lotes.movimentarEquipamento("IMP-000004", StatusRastreamento.EM_DESMONTE, "Separar cabeçote e placa", "gestor1");

    lotes.criarLote({ organizacaoId: "BR001", notaFiscal: "1002", transportadora: "Transportes Guamá", dataEntrada: diasAPartirDeHoje(-5), observacoes: "" });
    lotes.adicionarEquipamentoLote("LT003", dadosEquipamento(TipoEquipamento.COMPUTADOR_MESA, "Positivo", "Master D380", 2018, 6.5, EstadoFisico.USADO_LEVE), "gestor1");
    lotes.adicionarEquipamentoLote("LT003", dadosEquipamento(TipoEquipamento.ROTEADOR, "TP-Link", "Archer C6", 2022, 0.5, EstadoFisico.BOM_ESTADO), "gestor1");
    lotes.processarTriagem("LT003", "gestor1");

    lotes.criarLote({ organizacaoId: "BR002", notaFiscal: "2002", transportadora: "Logística Icoaraci", dataEntrada: diasAPartirDeHoje(-2), observacoes: "" });
    lotes.adicionarEquipamentoLote("LT004", dadosEquipamento(TipoEquipamento.FONTE_ALIMENTACAO, "Corsair", "CV550", 2020, 1.8, EstadoFisico.BOM_ESTADO), "gestor1");

    mkdirSync(PASTA_DEMO, { recursive: true });
    writeFileSync(join(PASTA_DEMO, "config.json"), JSON.stringify({ chaveMestra: chave, administrador: "admin" }, null, 4));

    console.log("Dados de demonstração criados.");
}

process.env.GREENCODE_DADOS = PASTA_DEMO;

if (!existsSync(join(PASTA_DEMO, "config.json"))) {
    criarDadosDeExemplo();
}

console.log("");
console.log("=== MODO DE DEMONSTRAÇÃO (dados na pasta data-demo) ===");
console.log("Usuários: admin / admin123 | operador1 / operador123 | gestor1 / gestor123 | auditor1 / auditor123");

await import("./index.js");