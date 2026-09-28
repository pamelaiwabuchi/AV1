import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

export class CriptografiaArquivo {
    private readonly algoritmo = "aes-256-gcm";

    gerarChave(): string {
        return randomBytes(32).toString("hex");
    }

    cifrar(dados: string, chave: string): string {
        const iv = randomBytes(12);
        const cipher = createCipheriv(this.algoritmo, Buffer.from(chave, "hex"), iv);

        const cifrado = Buffer.concat([cipher.update(dados, "utf8"), cipher.final()]);
        const tag = cipher.getAuthTag();

        return [iv.toString("hex"), tag.toString("hex"), cifrado.toString("hex")].join(":");
    }

    decifrar(dadosCifrados: string, chave: string): string {
        const partes = dadosCifrados.split(":");

        if (partes.length !== 3) {
            throw new Error("Conteúdo criptografado em formato inválido.");
        }

        const [ivHex, tagHex, cifradoHex] = partes as [string, string, string];

        const decipher = createDecipheriv(this.algoritmo, Buffer.from(chave, "hex"), Buffer.from(ivHex, "hex"));
        decipher.setAuthTag(Buffer.from(tagHex, "hex"));

        const decifrado = Buffer.concat([decipher.update(Buffer.from(cifradoHex, "hex")), decipher.final()]);

        return decifrado.toString("utf8");
    }
}