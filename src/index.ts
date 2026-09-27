import { iniciarSistema } from "./provisionamento.js"
import { fazerLogin } from "./autenticacao.js";


await iniciarSistema();

const usuarioLogado = await fazerLogin();

if (usuarioLogado === null) {
    process.exit(1);
}