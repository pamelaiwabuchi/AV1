import { Credencial } from "../src/Credencial.js";
import { Sessao } from "../src/Sessao.js";
import { PapelUsuario } from "../src/PapelUsuario.js";

function esperar(milissegundos: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milissegundos));
}

const amanda = Credencial.criarNova("amanda", "senha123", PapelUsuario.AUDITOR);
const tokenInicial = amanda.renovarToken();

const sessao = new Sessao(tokenInicial, amanda.getUsuario(), amanda.getPapel(), 2000);

console.log("1. Sessão criada. Válida?", sessao.isValida());
console.log("2. autenticar com o token certo:", sessao.autenticar("amanda", tokenInicial));
console.log("3. autenticar com um token errado:", sessao.autenticar("amanda", "token-falso"));

await esperar(1500);
sessao.renovar();
console.log("4. Depois de 1,5 s, renovou. Válida?", sessao.isValida());

await esperar(1000);
console.log("5. Mais 1 s (2,5 s desde a criação, mas só 1 s desde a renovação). Válida?", sessao.isValida());

await esperar(2500);
console.log("6. Mais 2,5 s sem renovar. Válida?", sessao.isValida());
console.log("7. autenticar com o token certo depois de expirar:", sessao.autenticar("amanda", tokenInicial));

const sessaoNova = new Sessao(amanda.renovarToken(), amanda.getUsuario(), amanda.getPapel(), 2000);
const tokenAntigo = sessaoNova.getToken();
const tokenNovo = sessaoNova.renovarToken();
console.log("8. Token antigo ainda funciona?", sessaoNova.autenticar("amanda", tokenAntigo));
console.log("9. Token novo funciona?", sessaoNova.autenticar("amanda", tokenNovo));