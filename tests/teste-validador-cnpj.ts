import { ValidadorCNPJ } from "../src/validadores/ValidadorCNPJ.js";
const validador = new ValidadorCNPJ();

const casos = [
    { cnpj: "11.222.333/0001-81", esperado: true },
    { cnpj: "11222333000181", esperado: true },
    { cnpj: " 11.222.333/0001-81 ", esperado: true },
    { cnpj: "11.222.333/0001-82", esperado: false },
    { cnpj: "12.ABC.345/01DE-35", esperado: true },
    { cnpj: "12.abc.345/01de-35", esperado: true },
    { cnpj: "12.ABC.345/01DE-36", esperado: false },
    { cnpj: "00.000.000/0000-00", esperado: false },
    { cnpj: "123", esperado: false }
];

for (const caso of casos) {
    const resultado = validador.validar(caso.cnpj);
    const status = resultado === caso.esperado ? "OK" : "FALHOU";
    console.log(`${status}  ${caso.cnpj}  →  ${resultado}  ${validador.obterMensagemErro()}`);
}