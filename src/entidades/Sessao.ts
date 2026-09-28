import { randomBytes } from "node:crypto";
import type { Autenticavel } from "../interfaces/Autenticavel.js";
import { PapelUsuario } from "../enums/PapelUsuario.js";

export class Sessao implements Autenticavel {
    private token: string;
    private usuario: string;
    private papel: PapelUsuario;
    private criacao: Date;
    private expiracao: Date;
    private readonly duracaoMs: number;

    constructor(token: string, usuario: string, papel: PapelUsuario, duracaoMs: number = 30 * 60 * 1000) {
        this.token = token;
        this.usuario = usuario;
        this.papel = papel;
        this.duracaoMs = duracaoMs;
        this.criacao = new Date();
        this.expiracao = new Date(Date.now() + this.duracaoMs);
    }

    isValida(): boolean {
        return Date.now() < this.expiracao.getTime();
    }

    renovar(): void {
        this.expiracao = new Date(Date.now() + this.duracaoMs);
    }

    autenticar(usuario: string, token: string): boolean {
        return usuario === this.usuario && token === this.token && this.isValida();
    }

    renovarToken(): string {
        this.token = randomBytes(32).toString("hex");
        return this.token;
    }

    getToken(): string {
        return this.token;
    }

    getUsuario(): string {
        return this.usuario;
    }

    getPapel(): PapelUsuario {
        return this.papel;
    }

    getCriacao(): Date {
        return this.criacao;
    }

    getExpiracao(): Date {
        return this.expiracao;
    }
}