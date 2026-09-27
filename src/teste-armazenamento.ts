import { gerarChave } from "./criptografia.js";
import { salvar, ler } from "./armazenamento.js";

// Chave só para o teste (no sistema de verdade, vem do config.json)
const chave = gerarChave();

// Dados de exemplo
const organizacoes = [
    { codigo: "BR001", nome: "Banco Exemplo" },
    { codigo: "BR002", nome: "Hospital Exemplo" }
];

// Salva criptografado
salvar("teste-organizacoes.json", organizacoes, chave);
console.log("Salvo. Abra data/teste-organizacoes.json para ver o conteúdo embaralhado.");

// Lê de volta
const lidas = ler<typeof organizacoes>("teste-organizacoes.json", chave);
console.log("Lido:", lidas);

// Arquivo que não existe deve devolver null
console.log("Arquivo inexistente:", ler("nao-existe.json", chave));