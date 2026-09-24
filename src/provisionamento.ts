import {existsSync} from 'node:fs';
import {join} from 'node:path';

const CAMINHO_CONFIG = join("data", "config.json")

export function iniciarSistema(): void {
    if (existsSync(CAMINHO_CONFIG)) {
    console.log("Sistema já configurado.")
    } else {
        console.log("Arquivo mestre não encontrado. Iniciando provisionamento...")
    }
}