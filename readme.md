npm init -y #iniciar o npm

npm install -D typescript tsx @types/node #Instalar o TypeScript

npx tsc --init #Criar o tsconfig

crypto.randomBytes(size[,callback]) 

## AES 256 is unbreakable by brute Force

A symmetric key is a type of encryption where you use the same key for encrypting and decrypting data.

asymmetric keys use different keys for encrypting and decrypting data. If you’re wondering which one of two is better, there isn’t—both have their uses.

sha 256 é pra nao guardar senha do usuario, so o hash gerado

AES-256 - 


em armazenamento ts a funcao salvar guarda os dados no disco de forma protegida. Ninguem consegue ler o arquivo sem a chave e o arquivo nunca fica corrompido se o programa cair no meio da gravação

Aqui está o resumo de tudo até agora.

## ✅ O que já está pronto
- **Setup:** projeto Node + TypeScript, GitHub, `npm start`.
- **`criptografia.ts`:** `gerarChave`, `gerarHash` (SHA-256), `criptografar` e `descriptografar` (AES-256-GCM).
- **`provisionamento.ts`:** verifica o `config.json`; se não existir, pede a senha do admin, gera a chave e grava.
- **`armazenamento.ts`:** `salvar` e `ler` com criptografia e escrita atômica (arquivo `.tmp` e depois renomeação).

## ⏳ Deixado para mais tarde (se der tempo)
- **Esconder a senha** enquanto ela é digitada no terminal.
- **Proteger o hash do admin**, que hoje fica em texto aberto no `config.json`.
- **Adicionar salt** ao hash das senhas.
- **Proteger a chave mestra** de algum jeito melhor (ver limitação 1).

## ⚠️ Limitações encontradas (para a documentação)
1. **Chave ao lado dos dados.** O `config.json` fica aberto e na mesma pasta dos arquivos criptografados; quem copiar a pasta `data` inteira leva o cofre e a chave. Ele não pode ser criptografado com a própria chave (problema do ovo e da galinha). Possíveis evoluções: calcular a chave a partir de uma senha digitada ao iniciar, ou usar o cofre de senhas do sistema operacional.
2. **Admin menos protegido que os outros usuários.** O hash do admin fica aberto no `config.json`, enquanto os demais ficam criptografados no `credenciais.json`.
3. **SHA-256 sem salt.** Senhas iguais geram hashes iguais, e senhas comuns podem ser descobertas por tabelas prontas da internet.
4. **Ambiguidade da tarefa sobre onde fica o admin.** Decisão tomada: o primeiro admin fica no `config.json`, e os demais usuários no `credenciais.json`, o que atende às duas frases do enunciado.
5. **Interface por terminal.** Ela é provisória; a própria tarefa prevê a interface web nas próximas atividades.

## 💡 Argumentos a favor (também para a documentação)
- **AES-256-GCM** detecta se alguém alterou os arquivos, o que combina com um sistema "auditável".
- **Escrita atômica:** se o programa cair durante a gravação, o arquivo anterior continua intacto.
- **Por que criptografar um sistema local:** outras pessoas usam a máquina; os papéis perderiam o sentido se desse para editar os arquivos por fora; backups e notebooks saem da empresa; e os dados servem de prova diante da Política Nacional de Resíduos Sólidos.
- **Primeiro admin:** quem instala é a pessoa de confiança. O provisionamento só acontece uma vez, ninguém se cadastra sozinho, e apagar o `config.json` para "virar admin" destrói a chave, deixando todos os dados inacessíveis.

## 📋 O que ainda precisa ser feito (obrigatório)
1. Ler a chave do `config.json`.
2. Login (admin no `config.json`, demais usuários no `credenciais.json`).
3. Admin cadastrar outros usuários, com papel.
4. Menu e permissões por papel (4 papéis).
5. Expiração de sessão após 30 minutos.
6. Journal (log de operações, retenção de 180 dias, rotação a cada 10 MB).
7. Validações de negócio (CNPJ, datas de lote, triagem antes do desmonte, justificativa).
8. CLI completa (comandos, autocompletar, histórico).
9. Scripts de teste da jornada completa e dos cenários de falha.
10. Documentação de segurança.
11. Testar no Windows e no Linux.

## ❓ Pendências
- **Diagrama UML:** ele não apareceu no PDF; confirmar onde está.
- **Constante `ARQUIVOS`** com os nomes dos arquivos, para criar quando começar os cadastros.

Se quiser, posso transformar isso num documento para você ir atualizando ao longo do projeto.


Para a lista de "deixar para o final", ficam então: salt, política de senha forte (tamanho mínimo, número, símbolo, maiúscula) e esconder a senha na digitação.

Encerramento automático da sessão aos 30 minutos, com aviso aos 25 minutos, usando setTimeout, interrompendo o question com AbortController e reagendando os temporizadores a cada ação.