import { CriptografiaArquivo } from "../src/persistencia/CriptografiaArquivo.js";
import { conferir, mostrarResultado } from "./conferencia.js";

function deuErro(acao: () => void): boolean {
    try {
        acao();
        return false;
    } catch {
        return true;
    }
}

const cripto = new CriptografiaArquivo();
const chave = cripto.gerarChave();
const original = '{"org": "BR001", "nf": "123456"}';

console.log("--- Cifrar e decifrar ---");
conferir("1. A chave tem 64 caracteres (32 bytes em hexadecimal)", chave.length, 64);

const cifrado = cripto.cifrar(original, chave);
conferir("2. O texto cifrado não contém o original", cifrado.includes("BR001"), false);
conferir("3. O texto cifrado tem 3 partes (iv:tag:conteúdo)", cifrado.split(":").length, 3);
conferir("4. Decifrar devolve exatamente o original", cripto.decifrar(cifrado, chave), original);

const cifradoDeNovo = cripto.cifrar(original, chave);
conferir("5. Cifrar o mesmo texto duas vezes gera resultados diferentes (IV aleatório)", cifradoDeNovo === cifrado, false);

console.log("--- Situações de falha ---");
conferir("6. Decifrar com a chave errada é recusado", deuErro(() => {
    cripto.decifrar(cifrado, cripto.gerarChave());
}), true);

const ultimoCaractere = cifrado.slice(-1);
const trocado = ultimoCaractere === "0" ? "1" : "0";
const adulterado = cifrado.slice(0, -1) + trocado;
conferir("7. Conteúdo adulterado (um caractere trocado) é recusado", deuErro(() => {
    cripto.decifrar(adulterado, chave);
}), true);

conferir("8. Conteúdo em formato inválido é recusado", deuErro(() => {
    cripto.decifrar("isto não é um arquivo criptografado", chave);
}), true);

mostrarResultado();