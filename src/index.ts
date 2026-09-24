import { gerarChave, gerarHash } from "./criptografia.js";

console.log("Chave 1:", gerarChave());
console.log("Chave 2:", gerarChave());

console.log("Hash de teste123:", gerarHash("teste123"));
console.log("Hash de teste123:", gerarHash("teste123"));
console.log("Hash de teste124:", gerarHash("teste124"));