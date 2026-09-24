// criptografa a senha

import {randomBytes, createHash} from "node:crypto"; // 

export function gerarChave(): string { //criptografa
    const buf = randomBytes(32).toString('hex')
    return buf
}

export function gerarHash(senha:string): string { //recebe uma senha e devolve o hash 
    return createHash('sha256').update(senha).digest('hex')
}