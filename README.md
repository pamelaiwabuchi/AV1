# greencode

Sistema de linha de comando para **logística reversa de equipamentos eletrônicos**, desenvolvido em Node.js e TypeScript.

O greencode acompanha o caminho de equipamentos descartados por organizações clientes (bancos, hospitais, empresas): do contrato com a organização, passando pela chegada dos lotes e pela triagem de cada equipamento, até o destino final (reaproveitamento de peças, reciclagem, descarte seguro ou baixa definitiva). Cada equipamento recebe um código de barras interno e pode ser rastreado do começo ao fim.

Não há banco de dados: todas as informações ficam em arquivos locais **criptografados** (AES-256-GCM), e toda transação é registrada num **journal** imutável.

A justificativa das escolhas de segurança e os cenários de falha testados estão em [DOCUMENTACAO.md](DOCUMENTACAO.md).

---

## Requisitos

- **Node.js 20.6 ou mais novo** (confira com `node --version`)
- **npm** (já vem com o Node.js)
- **Git**

Funciona em Linux e Windows.

---

## Instalação

```bash
git clone https://github.com/pamelaiwabuchi/AV1.git
cd AV1
npm install
```

O `npm install` baixa as ferramentas do projeto (TypeScript e tsx) para a pasta `node_modules`.

---

## Primeiro uso

```bash
npm start
```

Na **primeira vez**, o sistema não encontra os dados e faz o **provisionamento**:

1. pede para você **definir a senha do administrador** (e confirmar);
2. cria a pasta `data`, com a chave de criptografia e o usuário `admin`;
3. mostra a tela de login.

Entre com o usuário **`admin`** e a senha que você definiu. Os demais usuários são cadastrados pelo administrador, dentro do sistema.

Nas próximas vezes, o `npm start` vai direto para o login.

---

## Testar com dados de exemplo

```bash
npm run demo
```

Abre o sistema com dados de exemplo, prontos para testar todas as funções. Os dados ficam na pasta `data-demo`, separada da pasta `data`, para não alterar dados reais.

| Usuário | Senha | Papel |
|---|---|---|
| `admin` | `admin123` | Administrador |
| `operador1` | `operador123` | Operador de cadastro |
| `gestor1` | `gestor123` | Gestor de almoxarifado |
| `auditor1` | `auditor123` | Auditor |

O que já vem pronto:

| Dado | Situação | Para testar |
|---|---|---|
| Organização `BR001` | Contrato atual `CT002`, que substituiu o `CT001` | Relatório financeiro com contrato anterior |
| Organização `BR003` | Sem contrato | Recusa ao registrar um lote |
| Organização `BR004` | CNPJ alfanumérico | Formato novo de CNPJ |
| Lote `LT001` | Finalizado | Rastrear o `NOT-000001`, que passou por várias movimentações |
| Lote `LT002` | Encaminhado | Movimentar o `SER-000003` e o `IMP-000004` |
| Lote `LT003` | Em triagem | Avaliar o `COM-000005` e o `ROT-000006` |
| Lote `LT004` | Recebido | Iniciar a triagem e adicionar equipamentos |
| Parâmetros | Alíquota de 10% e monitor com 25% | Reverter a última alteração |

Nas perguntas de código, o sistema mostra os códigos disponíveis para aquela operação (até os 10 mais recentes).

Para recomeçar a demonstração do zero, apague a pasta `data-demo`.

## Como usar

### Papéis

| Papel | O que faz |
|---|---|
| **Administrador** | Possui acesso à todas as funções: cadastra usuários e configura os parâmetros globais (alíquota de impostos e coeficientes de depreciação) |
| **Operador de cadastro** | Cadastra organizações e seus contratos |
| **Gestor de almoxarifado** | Registra lotes, adiciona equipamentos, faz a triagem e movimenta os equipamentos |
| **Auditor** | Consulta históricos e o journal, e gera os relatórios |

O menu de cada pessoa mostra **apenas** o que o papel dela permite.

### Menu e comandos

Depois do login, você pode digitar o **número** de uma opção do menu ou um **comando**. Ou seja, para registrar um lote você pode usar essas duas formas:

```
Opção ou comando: 9
Opção ou comando: lote criar --org BR001 --nf 123456 --transp TransRapida
```

- Os parâmetros com `--` são opcionais: o que não for informado é perguntado em seguida.
- Valores com espaço vão entre aspas: `--transp "Trans Rápida"`.
- **`ajuda`** lista os comandos disponíveis para o seu papel.
- **Tab** completa os comandos.
- **Seta para cima** traz os comandos anteriores, mesmo depois de fechar e abrir o sistema.
- **`sair`**, em qualquer pergunta, volta ao menu principal. No menu principal, `sair` (ou `0`) encerra o sistema.
- Na tela de login, digitar `sair` no usuário encerra o sistema.

### Comandos disponíveis

| Comando | O que faz | Papéis |
|---|---|---|
| `usuario criar` | Cadastra um usuário | Administrador |
| `usuario listar` | Lista os usuários | Administrador, Auditor |
| `senha alterar` | Altera a própria senha | Todos |
| `organizacao criar` | Cadastra uma organização | Administrador, Operador |
| `organizacao listar` | Lista as organizações ativas | Todos |
| `contrato criar --org <código>` | Cadastra o contrato de uma organização | Administrador, Operador |
| `contrato renovar --org <código>` | Renova o contrato | Administrador, Operador |
| `contrato consultar --org <código>` | Mostra o contrato | Todos |
| `lote criar --org --nf --transp --data --obs` | Registra a chegada de um lote | Administrador, Gestor |
| `lote periodo --inicio --fim` | Lista os lotes de um período | Todos |
| `equipamento adicionar --lote <código>` | Adiciona equipamentos a um lote | Administrador, Gestor |
| `triagem iniciar --lote <código>` | Inicia a triagem de um lote | Administrador, Gestor |
| `equipamento avaliar --codigo <código>` | Avalia o estado físico de um equipamento | Administrador, Gestor |
| `lote relatorio --lote <código>` | Mostra o relatório de triagem de um lote | Todos |
| `equipamento movimentar --codigo <código>` | Envia para desmonte ou destino final | Administrador, Gestor |
| `equipamento rastrear --codigo <código>` | Mostra todo o histórico de um equipamento | Todos |
| `journal consultar --inicio --fim` | Mostra as transações de um período | Administrador, Auditor |
| `parametros consultar` | Mostra a alíquota e os coeficientes | Todos |
| `parametros aliquota` | Altera a alíquota de impostos | Administrador |
| `parametros depreciacao` | Altera o coeficiente de depreciação de um tipo | Administrador |
| `relatorio organizacao --org <código>` | Relatório de uma organização num período | Administrador, Auditor |
| `relatorio status` | Equipamentos por status (um ou todos) | Administrador, Auditor |
| `relatorio financeiro` | Receita dos contratos num período, com impostos | Administrador, Auditor |
| `parametros reverter` | Desfaz a última alteração da alíquota ou dos coeficientes (pede a senha) | Administrador |
| `menu` | Mostra o menu de novo (o mesmo que apertar Enter) | Todos |0

Datas são sempre no formato `dd/mm/aaaa`. Os códigos seguem os padrões `BR001` (organização), `CT001` (contrato), `LT001` (lote) e `NOT-000001` (código de barras do equipamento).

- Depois de cada comando, o resultado fica na tela e o menu não é repetido. **Enter** (ou `menu`) mostra o menu de novo.

### Fluxo típico

1. O **operador** cadastra a organização e o contrato.
2. O **gestor** registra o lote que chegou, adiciona os equipamentos (cada um recebe um código de barras), inicia a triagem, avalia cada equipamento e depois o movimenta para desmonte ou direto para o destino final.
3. O **auditor** rastreia equipamentos, consulta o journal e gera os relatórios.

---

## Como testar

### Jornada completa

```bash
npm test
```

Abre o sistema de verdade e simula quatro pessoas usando: o administrador provisiona o sistema e cadastra a equipe, o operador cadastra a organização e o contrato, o gestor registra o lote e movimenta os equipamentos, e o auditor rastreia um equipamento, gera um relatório e consulta o journal. No final, mostra quantos passos deram certo.

A jornada usa uma pasta própria (`data-jornada`), que é apagada no final. **Os dados na pasta `data` não são tocados.**

### Verificação de tipos

```bash
npm run verificar
```

Não deve mostrar nada: isso quer dizer que não há erros de TypeScript.

### Testes por parte do sistema

Cada arquivo da pasta `tests` testa uma parte isolada, e é rodado assim:

```bash
npx tsx tests/teste-lotes.ts
```

| Arquivo | O que testa |
|---|---|
| `teste-criptografia-arquivo.ts` | Cifrar e decifrar, e a recusa de arquivos adulterados |
| `teste-repositorio.ts` | Gravação e leitura dos arquivos criptografados |
| `teste-validador-cnpj.ts` | CNPJ numérico e alfanumérico |
| `teste-credencial.ts` | Senha com salt |
| `teste-sessao.ts` | Token e expiração da sessão |
| `teste-servico-autenticacao.ts` | Login, cadastro e alteração de senha |
| `teste-servico-organizacao.ts` | Cadastro de organizações |
| `teste-contratos.ts` | Cadastro, renovação e substituição de contratos |
| `teste-lotes.ts` | Registro de lotes e as regras da data de entrada |
| `teste-equipamentos.ts` | Cadastro, triagem e avaliação de equipamentos |
| `teste-rastreabilidade.ts` | Movimentações e rastreabilidade |
| `teste-journal.ts` | Journal, rotação de arquivos e reversão |
| `teste-parametros.ts` | Parâmetros globais e depreciação |
| `teste-relatorios.ts` | Relatórios e histórico de contratos |
| `teste-melhorias.ts` | Validação de telefone e e-mail |

Os testes usam uma pasta temporária (`data-teste`), que também é apagada no final.

---

## Estrutura do projeto

```
src/
├── index.ts          Ponto de entrada: monta os serviços e abre a interface
├── entidades/        Classes do domínio (Organizacao, Contrato, Lote, Equipamento...)
├── enums/            Papéis, status e tipos
├── interfaces/       Contratos de comportamento (Autenticavel, HistoricoCompleto)
├── validadores/      Validação de CNPJ e da data de entrada dos lotes
├── persistencia/     Criptografia e gravação dos arquivos
├── servicos/         Regras de negócio
└── cli/              Interface de linha de comando (menu, comandos, telas)
tests/                Testes de cada parte e a jornada completa
```

Pastas criadas durante o uso (não vão para o Git):

| Pasta | O que guarda |
|---|---|
| `data/` | Os dados do sistema, criptografados, e o journal |
| `relatorios/` | Os relatórios que o usuário escolheu salvar em arquivo |

---

## Como recomeçar do zero

Apague a pasta `data`. Na próxima vez que rodar `npm start`, o sistema faz o provisionamento de novo.

- Linux ou macOS: `rm -rf data`
- Windows (PowerShell): `Remove-Item -Recurse -Force data`

**Atenção:** isso apaga todos os usuários, organizações, lotes e equipamentos cadastrados.