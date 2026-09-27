import { randomBytes, createHash, createCipheriv, createDecipheriv } from "node:crypto";


// modo GCM, além de embaralhar, detecta se alguém alterou o conteúdo.
const ALGORITMO = "aes-256-gcm";

// Gera a chave mestra. Não recebe nada e devolve um texto (string).
export function gerarChave(): string {
    return randomBytes(32).toString("hex");
}

// Gera o hash de uma senha. Recebe a senha (texto) e devolve o hash (texto).
export function gerarHash(senha: string): string {
    return createHash("sha256").update(senha).digest("hex");
}

// Criptografa um texto. Recebe o texto original e a chave mestra, e devolve o texto embaralhado.
export function criptografar(texto: string, chave: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITMO, Buffer.from(chave, "hex"), iv);
    const dados = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString("hex"), tag.toString("hex"), dados.toString("hex")].join(":");
}

export function descriptografar(conteudo: string, chave: string): string {
    const partes = conteudo.split(":");
    if (partes.length !== 3) {
        throw new Error("Conteúdo criptografado em formato inválido.");
    }

    const [ivHex, tagHex, dadosHex] = partes as [string, string, string];

    const decipher = createDecipheriv(ALGORITMO, Buffer.from(chave, "hex"), Buffer.from(ivHex, "hex"));

    decipher.setAuthTag(Buffer.from(tagHex, "hex"));

    const dados = Buffer.concat([decipher.update(Buffer.from(dadosHex, "hex")), decipher.final()]);

    return dados.toString("utf8");
}