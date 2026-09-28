export enum Papel {
    Administrador = "administrador",
    Operador = "operador",
    Gestor = "gestor",
    Auditor = "auditor"
}

export interface Usuario {
    usuario: string;
    hashSenha: string;
    papel:Papel;
}

export interface Config {
    chaveMestra: string;
    administrador: Usuario;
}