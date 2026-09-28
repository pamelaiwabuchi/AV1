import { iniciarSistema } from "./provisionamento.js";
import { fazerLogin } from "./autenticacao.js";
import { abrirMenu } from "./menu.js";

await iniciarSistema();

while (true) {
    const usuarioLogado = await fazerLogin();

    if (usuarioLogado === null) {
        continue;
    }

    const resultado = await abrirMenu(usuarioLogado);

    if (resultado === "sair") {
        break;
    }
}