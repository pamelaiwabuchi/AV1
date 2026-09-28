import { randomBytes, createHash } from "node:crypto";
import type { Autenticavel } from "../interfaces/Autenticavel.js";
import { PapelUsuario } from "../enums/PapelUsuario.js";

export class Credencial implements Autenticavel {
    private usuario: string;
    private hashSenha: string;
    private salt: string;
    private ultimoAcesso: Date;
    private papel: PapelUsuario;

    constructor(usuario: string, hashSenha: string, salt: string, ultimoAcesso: Date, papel: PapelUsuario) {
        this.usuario = usuario;
        this.hashSenha = hashSenha;
        this.salt = salt;
        this.ultimoAcesso = ultimoAcesso;
        this.papel = papel;
    }

    static criarNova(usuario: string, senhaPlana: string, papel: PapelUsuario): Credencial {
        const salt = randomBytes(16).toString("hex");
        const hashSenha = Credencial.calcularHash(senhaPlana, salt);
        return new Credencial(usuario, hashSenha, salt, new Date(), papel);
    }

    private static calcularHash(senhaPlana: string, salt: string): string {
        return createHash("sha256").update(salt + senhaPlana).digest("hex");
    }

    verificarSenha(senhaPlana: string): boolean {
        const hashDigitado = Credencial.calcularHash(senhaPlana, this.salt);
        return hashDigitado === this.hashSenha;
    }

    atualizarUltimoAcesso(): void {
        this.ultimoAcesso = new Date();
    }

    autenticar(usuario: string, senha: string): boolean {
        return usuario === this.usuario && this.verificarSenha(senha);
    }

    renovarToken(): string {
        return randomBytes(32).toString("hex");
    }
        paraDados(): any {
        return {
            id: this.usuario,
            usuario: this.usuario,
            hashSenha: this.hashSenha,
            salt: this.salt,
            ultimoAcesso: this.ultimoAcesso,
            papel: this.papel
        };
    }

    static deDados(dados: any): Credencial {
        return new Credencial(dados.usuario, dados.hashSenha, dados.salt, new Date(dados.ultimoAcesso), dados.papel);
    }

    getUsuario(): string {
        return this.usuario;
    }

    getPapel(): PapelUsuario {
        return this.papel;
    }

    getUltimoAcesso(): Date {
        return this.ultimoAcesso;
    }
}