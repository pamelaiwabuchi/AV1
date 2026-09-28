import { rmSync } from "node:fs";
import { CriptografiaArquivo } from "../src/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../src/RepositorioArquivo.js";
import { ServicoAutenticacao } from "../src/ServicoAutenticacao.js";
import { PapelUsuario } from "../src/enums/PapelUsuario.js";

rmSync("data-teste", { recursive: true, force: true });

const chave = new CriptografiaArquivo().gerarChave();
const repositorio = new RepositorioArquivo("data-teste", chave);
const servico = new ServicoAutenticacao(repositorio);

servico.cadastrarUsuario("admin", "admin123", PapelUsuario.ADMINISTRADOR);
servico.cadastrarUsuario("amanda", "amanda2026", PapelUsuario.AUDITOR);
console.log("1. Usuários cadastrados:", servico.listarUsuarios().map((c) => `${c.getUsuario()} (${c.getPapel()})`));

try {
    servico.cadastrarUsuario("amanda", "outra", PapelUsuario.AUDITOR);
} catch (erro) {
    console.log("2. Cadastro repetido:", (erro as Error).message);
}

const sessao = servico.login("amanda", "amanda2026");
console.log("3. Login da Amanda. Papel da sessão:", sessao.getPapel());

try {
    servico.login("amanda", "senha-errada");
} catch (erro) {
    console.log("4. Login com senha errada:", (erro as Error).message);
}

console.log("5. Token da sessão é válido?", servico.validarToken(sessao.getToken()));
servico.logout(sessao.getToken());
console.log("6. Depois do logout, o token é válido?", servico.validarToken(sessao.getToken()));

console.log("7. Alterar senha com a senha antiga errada:", servico.alterarSenha("amanda", "errada", "nova2026"));
console.log("8. Alterar senha com a senha antiga certa:", servico.alterarSenha("amanda", "amanda2026", "nova2026"));

const servicoReiniciado = new ServicoAutenticacao(repositorio);
console.log("9. Depois de reiniciar, usuários lidos do arquivo:", servicoReiniciado.listarUsuarios().map((c) => c.getUsuario()));
console.log("10. Depois de reiniciar, login com a senha nova:", servicoReiniciado.login("amanda", "nova2026").getUsuario());

try {
    servicoReiniciado.login("amanda", "amanda2026");
} catch (erro) {
    console.log("11. Depois de reiniciar, login com a senha antiga:", (erro as Error).message);
}

rmSync("data-teste", { recursive: true, force: true });