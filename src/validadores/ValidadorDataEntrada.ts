import { Validador } from "./Validador.js";

export class ValidadorDataEntrada extends Validador {
    private readonly limiteDias = 90;

    validar(data: Date): boolean {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const limite = new Date(hoje);
        limite.setDate(limite.getDate() - this.limiteDias);

        const dataEntrada = new Date(data);
        dataEntrada.setHours(0, 0, 0, 0);

        if (dataEntrada.getTime() > hoje.getTime()) {
            this.mensagemErro = "A data de entrada não pode ser futura.";
            return false;
        }

        if (dataEntrada.getTime() < limite.getTime()) {
            this.mensagemErro = `A data de entrada não pode ser anterior a ${this.limiteDias} dias.`;
            return false;
        }

        this.mensagemErro = "";
        return true;
    }
}