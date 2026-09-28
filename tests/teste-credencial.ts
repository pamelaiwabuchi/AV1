import { Credencial } from "../src/entidades/Credencial.js";
import { PapelUsuario } from "../src/enums/PapelUsuario.js";

const amanda = Credencial.criarNova("amanda", "senha123", PapelUsuario.AUDITOR);
const jose = Credencial.criarNova("jose", "senha123", PapelUsuario.GESTOR_ALMOXARIFADO);

console.log("1. Amanda e José têm a mesma senha, mas salts e hashes diferentes:");
console.log(amanda);
console.log(jose);

console.log("2. Senha certa da Amanda:", amanda.verificarSenha("senha123"));
console.log("3. Senha errada da Amanda:", amanda.verificarSenha("senha124"));

console.log("4. autenticar com usuário e senha certos:", amanda.autenticar("amanda", "senha123"));
console.log("5. autenticar com o usuário errado:", amanda.autenticar("jose", "senha123"));

console.log("6. Dois tokens gerados:", amanda.renovarToken(), amanda.renovarToken());

const antes = amanda.getUltimoAcesso();
setTimeout(() => {
    amanda.atualizarUltimoAcesso();
    console.log("7. Último acesso antes:", antes.toISOString(), "| depois:", amanda.getUltimoAcesso().toISOString());
    console.log("8. Papel da Amanda:", amanda.getPapel());
}, 1000);