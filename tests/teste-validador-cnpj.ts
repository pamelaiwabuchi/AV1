import { ValidadorCNPJ } from "../src/validadores/ValidadorCNPJ.js";
import { conferir, mostrarResultado } from "./conferencia.js";

const validador = new ValidadorCNPJ();

const casos = [
    { descricao: "numérico com pontuação", cnpj: "11.222.333/0001-81", esperado: true },
    { descricao: "numérico sem pontuação", cnpj: "11222333000181", esperado: true },
    { descricao: "com espaços antes e depois", cnpj: " 11.222.333/0001-81 ", esperado: true },
    { descricao: "numérico com dígito verificador errado", cnpj: "11.222.333/0001-82", esperado: false },
    { descricao: "alfanumérico (formato de 2026)", cnpj: "12.ABC.345/01DE-35", esperado: true },
    { descricao: "alfanumérico em minúsculas", cnpj: "12.abc.345/01de-35", esperado: true },
    { descricao: "alfanumérico com dígito verificador errado", cnpj: "12.ABC.345/01DE-36", esperado: false },
    { descricao: "todos os dígitos iguais", cnpj: "00.000.000/0000-00", esperado: false },
    { descricao: "curto demais", cnpj: "123", esperado: false }
];

casos.forEach((caso, i) => {
    conferir(`${i + 1}. ${caso.descricao}: ${caso.cnpj}`, validador.validar(caso.cnpj), caso.esperado);
});

mostrarResultado();