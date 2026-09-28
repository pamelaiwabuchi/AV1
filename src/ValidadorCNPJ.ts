import { Validador } from "./Validador.js";

export class ValidadorCNPJ extends Validador {
    private readonly pesosPrimeiroDigito = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    private readonly pesosSegundoDigito = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    validar(cnpj: string): boolean {
        const cnpjLimpo = this.limpar(cnpj);

        if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpjLimpo)) {
            this.mensagemErro = "CNPJ em formato inválido. Use 14 caracteres: 12 letras ou números e 2 dígitos no final.";
            return false;
        }

        if (cnpjLimpo === cnpjLimpo.charAt(0).repeat(14)) {
            this.mensagemErro = "CNPJ inválido: todos os caracteres são iguais.";
            return false;
        }

        const base = cnpjLimpo.slice(0, 12);
        const primeiroDigito = this.calcularDigito(base, this.pesosPrimeiroDigito);
        const segundoDigito = this.calcularDigito(base + primeiroDigito, this.pesosSegundoDigito);
        const digitosCalculados = `${primeiroDigito}${segundoDigito}`;

        if (cnpjLimpo.slice(12) !== digitosCalculados) {
            this.mensagemErro = "CNPJ inválido: os dígitos verificadores não conferem.";
            return false;
        }

        this.mensagemErro = "";
        return true;
    }

    private limpar(cnpj: string): string {
        return cnpj.trim().toUpperCase().replaceAll(".", "").replaceAll("/", "").replaceAll("-", "");
    }

    private calcularDigito(base: string, pesos: number[]): number {
        let soma = 0;

        pesos.forEach((peso, posicao) => {
            const valor = base.charCodeAt(posicao) - 48;
            soma = soma + valor * peso;
        });

        const resto = soma % 11;

        if (resto < 2) {
            return 0;
        }

        return 11 - resto;
    }
}