import { RepositorioArquivo } from "../persistencia/RepositorioArquivo.js";
import { TipoEquipamento } from "../enums/TipoEquipamento.js";

const ARQUIVO_PARAMETROS = "parametros.json";
const ID_PARAMETROS = "globais";

const COEFICIENTES_PADRAO: Record<TipoEquipamento, number> = {
    [TipoEquipamento.COMPUTADOR_MESA]: 20,
    [TipoEquipamento.NOTEBOOK]: 20,
    [TipoEquipamento.MONITOR]: 20,
    [TipoEquipamento.IMPRESSORA]: 10,
    [TipoEquipamento.SERVIDOR]: 20,
    [TipoEquipamento.ROTEADOR]: 20,
    [TipoEquipamento.CABO_ESTRUTURADO]: 10,
    [TipoEquipamento.FONTE_ALIMENTACAO]: 10
};

export class ServicoParametros {
    private readonly repositorio: RepositorioArquivo;

    constructor(repositorio: RepositorioArquivo) {
        this.repositorio = repositorio;
    }

    obterAliquota(): number {
        return this.carregar().aliquotaImposto;
    }

    obterCoeficiente(tipo: TipoEquipamento): number {
        return this.carregar().coeficientesDepreciacao[tipo];
    }

    listarCoeficientes(): Record<TipoEquipamento, number> {
        return this.carregar().coeficientesDepreciacao;
    }

    alterarAliquota(novaAliquota: number): void {
        this.validarPercentual(novaAliquota, "A alíquota");

        const parametros = this.carregar();
        parametros.aliquotaImposto = novaAliquota;
        this.repositorio.salvarEntidade(ARQUIVO_PARAMETROS, parametros);
    }

    alterarCoeficiente(tipo: TipoEquipamento, novoCoeficiente: number): void {
        this.validarPercentual(novoCoeficiente, "O coeficiente de depreciação");

        const parametros = this.carregar();
        parametros.coeficientesDepreciacao[tipo] = novoCoeficiente;
        this.repositorio.salvarEntidade(ARQUIVO_PARAMETROS, parametros);
    }

    validarPercentual(valor: number, nome: string): void {
        if (Number.isNaN(valor) || valor < 0 || valor > 100) {
            throw new Error(`${nome} precisa ser um percentual entre 0 e 100.`);
        }
    }

    private carregar(): any {
        const salvos = this.repositorio.carregarEntidade(ARQUIVO_PARAMETROS, ID_PARAMETROS);

        if (salvos !== null) {
            return salvos;
        }

        return {
            id: ID_PARAMETROS,
            aliquotaImposto: 0,
            coeficientesDepreciacao: { ...COEFICIENTES_PADRAO }
        };
    }
}