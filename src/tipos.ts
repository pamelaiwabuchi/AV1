export interface Usuario {
    usuario: string;
    hashSenha: string;
    papel:string;
}

export interface Config {
    chaveMestra: string;
    administrador: Usuario;
}