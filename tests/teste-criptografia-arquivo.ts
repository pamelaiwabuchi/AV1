import { CriptografiaArquivo } from "../src/CriptografiaArquivo.js";

const cripto = new CriptografiaArquivo();

const chave = cripto.gerarChave();
console.log("Chave:", chave);

const original = '{"org": "BR001", "nf": "123456"}';
const cifrado = cripto.cifrar(original, chave);
console.log("Cifrado:", cifrado);

const decifrado = cripto.decifrar(cifrado, chave);
console.log("Decifrado:", decifrado);
console.log("Igual ao original?", decifrado === original);

try {
    cripto.decifrar(cifrado, cripto.gerarChave());
} catch {
    console.log("Chave errada: falhou, como esperado.");
}