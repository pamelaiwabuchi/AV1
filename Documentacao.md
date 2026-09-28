# greencode — Documentação técnica

Este documento explica as principais decisões do sistema: as escolhas de segurança e o motivo de cada uma, as regras de negócio que precisaram ser definidas, as diferenças em relação ao diagrama UML, os cenários de falha testados e as limitações conhecidas, bem como melhorias que serão implementadas na próxima AV.

Para instalar e usar o sistema, veja o [README](README.md).

---

## 1. Visão geral da arquitetura

O sistema segue o diagrama UML do enunciado e está dividido em camadas, cada uma com uma responsabilidade:

| Camada | Pasta | Responsabilidade |
|---|---|---|
| Entidades | `src/entidades` | Os objetos do domínio e as regras que dependem só deles (por exemplo, o equipamento sabe calcular a própria depreciação) |
| Serviços | `src/servicos` | As regras de negócio que envolvem mais de um objeto (por exemplo, registrar um lote exige uma organização com contrato vigente) |
| Persistência | `src/persistencia` | Criptografar e gravar os arquivos |
| Validadores | `src/validadores` | Validação de CNPJ e da data de entrada dos lotes |
| Interface | `src/cli` | O menu, os comandos e as telas |

Os dados do negócio (usuários, organizações, contratos, lotes, equipamentos e parâmetros) nunca são gravados diretamente pela interface: ela sempre chama um serviço, que confere as regras e usa a persistência. Assim, as regras ficam num lugar só, e a mesma camada de serviços poderá ser reaproveitada numa interface web.

A interface grava diretamente apenas três arquivos:
- o `config.json`, criado no provisionamento (junto com a pasta `data`);
- o `historico.enc`, com os comandos digitados, também criptografado;
- os relatórios que o usuário pode escolher salvar, na pasta `relatorios`.
---

## 2. Segurança

### 2.1 Criptografia dos arquivos (AES-256-GCM)

O enunciado exige que os dados fiquem em arquivos, sem banco de dados, e que esses arquivos sejam criptografados.

**Arquivos criptografados:** `credenciais.json`, `organizacoes.json`, `contratos-anteriores.json`, `lotes.json`, `equipamentos.json`, `parametros.json`, `historico.enc` (comandos digitados) e o journal (cada linha criptografada separadamente). Vale ressaltar que `historico.enc` não armazena nenhuma senha digitada no terminal. Isso ocorre pois ele armazena apenas os comandos digitados no menu principal, e as senhas são digitadas sempre em outras perguntas.

**Arquivos não criptografados:**
- `config.json`, que guarda a própria chave de criptografia - o que traz uma limitação de segurança, descrita mais à frente na [seção 7](#7-limitações-conhecidas-e-melhorias-futuras);
- os relatórios que o usuário escolhe salvar, porque a ideia é justamente outra pessoa conseguir ler, logo, a criptografia aqui não se faz necessária.

**Por que AES-256-GCM:**
- **AES** é um algoritmo simétrico: a mesma chave cifra e decifra. Serve aqui porque é o próprio sistema que grava e lê os arquivos.
- **256** é o tamanho da chave, em bits (32 bytes). É o maior tamanho do AES. A chave é gerada com `randomBytes(32)`, que usa o gerador de números aleatórios seguro do sistema operacional.
- **GCM** é um modo **autenticado**: além de esconder o conteúdo (confidencialidade), ele gera uma etiqueta de autenticação (a *tag*) que detecta qualquer alteração no arquivo (integridade). Se alguém mudar um único caractere, a leitura falha, em vez de devolver dados corrompidos ou forjados.
- Cada gravação usa um **IV** (vetor de inicialização) novo e aleatório, de 12 bytes. Assim, o mesmo conteúdo gravado duas vezes gera textos cifrados diferentes.
- Cada arquivo fica no formato `iv:tag:conteúdo`, em hexadecimal.

**Por que não outras opções:**
- **AES-CBC** esconde o conteúdo, mas não detecta alterações; precisaria de um segundo mecanismo (HMAC) só para isso.
- **AES-ECB** deixa padrões do conteúdo visíveis, porque blocos iguais geram cifras iguais.
- Criar um algoritmo próprio nunca é recomendado em segurança.
- Foi usado o módulo nativo do Node (`node:crypto`), sem bibliotecas externas.

**Escrita atômica:** o sistema nunca sobrescreve um arquivo diretamente. Ele grava primeiro um arquivo temporário (`.tmp`) e só depois o renomeia por cima do original. Se o programa for interrompido no meio da gravação, o arquivo original continua inteiro.

### 2.2 Senhas (SHA-256 com salt)

Um dos requisitos do projeto é que senhas sejam protegidas com o algoritmo de hash **SHA-256**.

- A senha propriamente dita **nunca é guardada**. O sistema guarda apenas o **hash**: um "resumo" de tamanho fixo (64 caracteres) calculado a partir da senha. 
- No login, o sistema calcula o hash da senha digitada e compara com o guardado.
- Cada usuário tem um **salt**: 16 bytes aleatórios, gerados no cadastro e juntados à senha antes do cálculo. Por causa do salt, duas pessoas com a mesma senha têm hashes diferentes, e tabelas prontas de "senha → hash" (as *rainbow tables*) deixam de funcionar.
- Na troca de senha, um salt novo é gerado.
- A senha digitada é retirada do histórico de comandos, para não aparecer na seta para cima.

**Diferença entre os dois "256" do projeto:** o SHA-256 é um **hash** (sem volta), usado nas senhas, que só precisam ser conferidas. O AES-256 é **criptografia** (com volta), usado nos arquivos, que precisam ser lidos de novo.

### 2.3 Sessão

- No login, o sistema cria uma **sessão** com um token aleatório de 32 bytes.
- A sessão expira depois de **30 minutos sem uso**. A cada comando, o prazo é renovado - Obs: na próxima implementação o usuário será avisado quando faltar 5 minutos para expirar a atividade.
- Com a sessão expirada, o sistema pede o login de novo.
- Ao sair, a sessão é encerrada.

### 2.4 Papéis e permissões

| Papel | Permissões |
|---|---|
| Administrador | Todas (inclui cadastrar usuários e alterar os parâmetros globais) |
| Operador de cadastro | Organizações e contratos, além das consultas gerais |
| Gestor de almoxarifado | Lotes, equipamentos, triagem e movimentações, além das consultas gerais |
| Auditor | Consultas, journal, listagem de usuários e relatórios |

- O menu mostra **apenas** as opções que o papel permite, pra facilitar a visualização.
- Se alguém digitar um comando de outro papel, o sistema recusa com um aviso, e a tentativa fica registrada no journal.

### 2.5 Journal de transações

- **Tudo** é registrado: cada opção do menu e cada comando, cada dado criado, alterado ou excluído, os logins (certos e errados), os logouts, as sessões expiradas e o provisionamento.
- Nas alterações de dados, o registro guarda os **dados de antes e de depois**, e é gravado **antes** de a alteração ser aplicada.
- O journal é **imutável**: o sistema só acrescenta linhas no final do arquivo, e nunca edita ou apaga uma linha.
- Cada linha é **criptografada** separadamente, porque o journal guarda cópias dos dados protegidos.
- **Rotação:** quando o arquivo passa de **10 MB**, ele é renomeado com a data e a hora, e um arquivo novo começa. Se dois arquivos forem rotacionados no mesmo milissegundo, o segundo recebe um número no final, para um não substituir o outro.
- **Retenção:** de acordo com os critérios, o journal deve ser mantido por no mínimo 180 dias. Nesta primeira versão os arquivos nunca são apagados.
- A consulta do journal é permitida ao **administrador** e ao **auditor**.
- O método `reverter()` desfaz uma alteração, restaurando os dados de antes. Ele devolve `true` quando consegue e `false` quando a transação não alterou dados (um login, por exemplo). No sistema, ele é usado para **reverter a última alteração dos parâmetros globais**, pelo comando `parametros reverter`, disponível só para o administrador. Antes de reverter, o sistema mostra o que vai mudar e pede a senha do administrador; se a senha estiver errada, a reversão é cancelada, sem nova tentativa. A reversão fica registrada no journal, com uma linha `REVERTER` e uma `ALTERAR`.
- A reversão foi liberada só para os parâmetros porque eles não afetam outros dados. Reverter os demais dados com segurança exigiria tratar as dependências entre eles: por exemplo, desfazer a criação de uma organização deixaria os lotes dela sem organização, e desfazer uma movimentação antiga apagaria as movimentações que vieram depois.

### 2.6 Histórico de comandos

- A seta para cima traz os comandos anteriores, mesmo depois de fechar o sistema.
- O histórico guarda **só os comandos** digitados no menu principal, e nunca as respostas dos formulários nem as senhas.
- O arquivo `historico.enc` é criptografado, e guarda no máximo 200 comandos.

### 2.7 Provisionamento

- Na primeira execução, o sistema pede a senha do administrador, gera a chave de criptografia e cria o usuário `admin`.
- A senha do administrador é tratada como qualquer outra: fica só o hash com salt, dentro do `credenciais.json` criptografado.

---

## 3. Regras de negócio decididas

O enunciado deixa várias regras em aberto. Estas foram as decisões tomadas.

### Organizações
- Todos os campos são obrigatórios: razão social, CNPJ, inscrição estadual, endereço, telefone e e-mail.
- O CNPJ é validado pelos dígitos verificadores, no formato numérico e no novo formato **alfanumérico** (em vigor a partir de 2026). Não pode haver dois cadastros com o mesmo CNPJ.
- O telefone precisa ter o DDD (10 ou 11 dígitos), e o e-mail precisa ter o formato `nome@dominio.com`.
- Os códigos seguem o padrão `BR001`, `BR002`...

### Contratos
- Todos os campos são obrigatórios. As cláusulas são digitadas uma por linha.
- O vencimento precisa ser depois da assinatura. A assinatura pode ser uma data futura.
- O valor mensal aceita vírgula nos centavos, e pode ser zero.
- Cadastrar um contrato para uma organização que já tem um **substitui** o atual, depois de uma confirmação. O contrato substituído é guardado, e passa a valer só até o dia anterior ao início do novo. Isso evita que o relatório financeiro some os dois no mesmo período.
- Renovar só adia o vencimento.

### Lotes
- Nota fiscal e transportadora são obrigatórias; observações são opcionais.
- A data de entrada não pode ser futura nem ter mais de 90 dias. A pessoa pode digitar `1` para usar a data de hoje.
- Só organizações ativas e com contrato vigente podem registrar lotes.
- A mesma nota fiscal não pode ser usada duas vezes pela mesma organização (organizações diferentes podem usar o mesmo número).
- Status do lote: `RECEBIDO` → `EM_TRIAGEM` → `TRIAGEM_CONCLUIDA` → `ENCAMINHADO` → `FINALIZADO`. O status muda sozinho, conforme os equipamentos avançam: o lote fica `ENCAMINHADO` quando o primeiro equipamento sai de `AGUARDANDO_DESMONTE`, e `FINALIZADO` quando todos têm destino final.

### Equipamentos
- Todos os campos são obrigatórios. O ano não pode ser futuro, e o peso precisa ser maior que zero.
- Cada equipamento recebe um código de barras interno: as três primeiras letras do tipo e uma sequência de seis dígitos (por exemplo, `NOT-000001`).
- Na triagem, se o estado físico cair **duas categorias ou mais** em relação ao declarado, a justificativa é obrigatória.
- Toda movimentação depois da triagem exige justificativa.
- Fluxo: `AGUARDANDO_TRIAGEM` → `EM_TRIAGEM` → `AGUARDANDO_DESMONTE` → `EM_DESMONTE` → destino final. De `AGUARDANDO_DESMONTE`, o equipamento também pode ir direto para um destino final.
- Destinos finais: `PECAS_REAPROVEITADAS`, `MATERIAL_RECICLAVEL`, `DESCARTE_SEGURO` e `BAIXA_DEFINITIVA`.

### Parâmetros globais e depreciação
- O administrador altera a alíquota de impostos e os coeficientes de depreciação; todos podem consultar.
- Os coeficientes são **por tipo de equipamento**, e começam com as taxas do Anexo III da Instrução Normativa RFB nº 1.700/2017:

| Tipo | Taxa anual | Base |
|---|---|---|
| Computador de mesa, notebook, servidor | 20% | NCM 8471 |
| Roteador | 20% | NCM 8517 |
| Impressora | 10% | NCM 8443 |
| Fonte de alimentação | 10% | NCM 8504 |
| Monitor | 20% | aproximação: sem posição própria na tabela; tratado como equipamento de informática |
| Cabo estruturado | 10% | aproximação: sem posição própria; tratado como instalação |

- A depreciação usa o **método linear**, o mais comum no Brasil: taxa anual × idade do equipamento (ano atual − ano de fabricação), com limite de 100%. Um equipamento 100% depreciado não vale mais nada na contabilidade, mas ainda pode ter valor como peças ou material reciclável.
- A alíquota começa em 0% e é usada no relatório financeiro.

### Relatórios
- Os três relatórios (por organização, por status e financeiro) são permitidos só ao **administrador** e ao **auditor**.
- O relatório por status pode mostrar um status ou todos; os status vazios aparecem com "Nenhum equipamento neste status".
- **Financeiro:** para cada organização, cada contrato entra com o valor **proporcional aos dias** em que esteve vigente dentro do período (valor mensal ÷ 30 × dias). Depois vêm a receita bruta, os impostos (pela alíquota) e a receita líquida.
- O período pode ser escolhido por atalhos (último mês, 3, 6 ou 12 meses, 5 anos) ou digitado.
- O relatório sempre aparece na tela, e só é salvo em arquivo se o usuário pedir.

### Interface
- O menu numerado e os comandos digitados convivem. O que faltar num comando é perguntado.
- Cada campo é conferido **na hora** em que é digitado: se estiver errado, só aquele campo é perguntado de novo, com a opção de digitar `sair` para voltar ao menu.
- As mensagens têm três níveis: `[OK]` (deu certo), `[AVISO]` (nada deu errado, mas a operação não foi feita) e `[ERRO]` (uma regra foi violada).

---

## 4. Diferenças em relação ao diagrama UML

O diagrama foi seguido. As diferenças abaixo foram necessárias para a implementação:

**Classes e arquivos acrescentados:**
- `ServicoJournal`: cuida do arquivo do journal (gravar, rotacionar e consultar), da mesma forma que o `RepositorioArquivo` cuida dos arquivos de dados;
- `ServicoParametros`: guarda e valida os parâmetros globais;
- as **telas** (`TelaUsuarios`, `TelaOrganizacoes`, `TelaLotes`, `TelaEquipamentos`, `TelaJournal`, `TelaParametros`, `TelaRelatorios`): dividem a `CLIInterface`, que ficaria grande demais com tudo junto;
- `HistoricoComandos`, `interpretadorComandos`, `perguntas`, `mensagens` e `conversores`: apoio à interface.

**Métodos com parâmetros a mais:**
- `JournalTransacao.registrar(journal)` e `reverter(repositorio)`: a transação precisa de alguém para gravar e restaurar os dados;
- `Equipamento.calcularDepreciacao(coeficiente)`: o equipamento não tem acesso aos parâmetros globais, então quem chama o método entrega o coeficiente do tipo.

**Métodos acrescentados:**
- `ServicoRelatorio.gerarRelatorioTodosOsStatus()`, para a opção de ver todos os status de uma vez;
- métodos de verificação nos serviços (`verificarCnpj`, `verificarTelefone`, `verificarEmail`, `verificarOrganizacao`, `verificarNotaFiscal`), usados para conferir cada campo na hora em que é digitado.

---

## 5. Cenários de falha testados

A pasta `tests` tem um teste para cada parte do sistema, e o `npm test` roda a jornada completa.

| Cenário | Resultado esperado | Arquivo |
|---|---|---|
| Arquivo criptografado adulterado | A leitura é recusada | `teste-criptografia-arquivo.ts` |
| Arquivo do journal aberto sem a chave | Conteúdo ilegível | `teste-journal.ts` |
| CNPJ com dígito verificador errado | Cadastro recusado | `teste-validador-cnpj.ts`, `teste-servico-organizacao.ts` |
| CNPJ repetido (mesmo digitado sem pontuação) | Cadastro recusado | `teste-servico-organizacao.ts` |
| Campo obrigatório vazio | Cadastro recusado | `teste-servico-organizacao.ts` |
| Telefone sem DDD ou e-mail sem `@` | Cadastro recusado | `teste-melhorias.ts` |
| Senha errada | Login recusado | `teste-servico-autenticacao.ts` |
| Sessão sem uso por mais de 30 minutos | Sessão expirada | `teste-sessao.ts` |
| Vencimento antes da assinatura | Contrato recusado | `teste-contratos.ts` |
| Lote de organização sem contrato vigente | Registro recusado | `teste-lotes.ts` |
| Lote com data futura ou de mais de 90 dias | Registro recusado | `teste-lotes.ts` |
| Nota fiscal repetida na mesma organização | Registro recusado | `teste-lotes.ts` |
| Estado físico caindo 2 categorias sem justificativa | Avaliação recusada | `teste-equipamentos.ts` |
| Movimentar antes da triagem, ou sem justificativa | Movimentação recusada | `teste-rastreabilidade.ts` |
| Movimentar um equipamento que já tem destino final | Movimentação recusada | `teste-rastreabilidade.ts` |
| Journal passando do tamanho máximo | Arquivo rotacionado sem perder registros | `teste-journal.ts` |
| Reverter uma transação sem dados (login) | Devolve `false` | `teste-journal.ts` |
| Alíquota ou coeficiente fora de 0% a 100% | Alteração recusada | `teste-parametros.ts` |
| Contrato substituído no meio do período | Relatório financeiro sem cobrança em dobro | `teste-relatorios.ts` |
| Usuário tentando comando de outro papel | Comando recusado | `jornada-completa.ts` |

A **jornada completa** simula quatro pessoas usando o sistema de verdade (administrador, operador, gestor e auditor), do provisionamento até a rastreabilidade de um equipamento depois de várias movimentações, e confere automaticamente cada passo.

---

## 6. Compatibilidade com Linux e Windows

Cuidados tomados no código:
- os caminhos de arquivos são montados com `join`, que usa a barra certa em cada sistema;
- os nomes de arquivos gerados (journal rotacionado e relatórios) não usam `:`, que o Windows não aceita;
- a jornada abre o sistema com o próprio Node, sem depender do `npx`.

Testes realizados:
- **Linux:** [PREENCHER: distribuição e versão do Node]. Todos os testes e a jornada completa passaram.
- **Windows:** [PREENCHER: versão do Windows, versão do Node e o resultado].

---

## 7. Limitações conhecidas e melhorias futuras

**Chave de criptografia ao lado dos dados.** A chave fica no `config.json`, em texto aberto, na mesma pasta dos dados. Quem copiar a pasta `data` inteira consegue decifrar tudo. A criptografia protege contra quem tem acesso a um arquivo isolado e detecta adulterações, mas não protege contra quem tem a pasta inteira. Melhoria: derivar a chave de uma senha digitada ao iniciar o sistema (com PBKDF2 ou scrypt), ou guardá-la no cofre de senhas do sistema operacional.

**Algoritmo das senhas.** O SHA-256 foi usado por exigência do enunciado, com salt. Por ser um algoritmo rápido, ele permite muitas tentativas por segundo a quem tiver o arquivo de credenciais. Melhoria: algoritmos feitos para senhas, como bcrypt ou scrypt, que são propositalmente lentos.

**Senha visível ao digitar.** A senha aparece na tela enquanto é digitada (mas nunca vai para o histórico). Melhoria: silenciar a saída do terminal durante a digitação.

**Sem limite de tentativas de login.** Não há bloqueio depois de várias senhas erradas. Melhoria: bloquear o usuário por alguns minutos depois de, por exemplo, cinco erros seguidos.

**Sem política de senha forte.** Qualquer senha não vazia é aceita. Melhoria: exigir um tamanho mínimo e combinações de letras, números e símbolos.

**Expiração da sessão.** A sessão expira depois de 30 minutos, mas isso só é percebido quando a pessoa digita algo. Melhoria: encerrar a sessão automaticamente, com um aviso alguns minutos antes.

**Depreciação pelo ano de fabricação.** Na contabilidade, a depreciação conta a partir de quando o bem entra em uso. O sistema só tem o ano de fabricação, então usa esse ano como aproximação.

**Dependência do relógio do computador.** Todas as datas "de hoje" (validade de contratos, prazo dos lotes, sessão, depreciação) vêm do relógio do computador. Se ele estiver errado, as datas também ficam erradas.

**Relatórios salvos sem criptografia.** Os relatórios salvos em arquivo ficam em texto aberto, para poderem ser lidos por outras pessoas. Por isso a pasta `relatorios` fica fora do Git.

**Crescimento do journal.** Como os arquivos do journal nunca são apagados, eles se acumulam com o tempo. Melhoria: arquivar ou apagar automaticamente os arquivos com mais de 180 dias, se a política da empresa permitir.

**Reversão de outros dados.** Hoje só os parâmetros globais podem ser revertidos. Estender a reversão para os demais dados exigiria regras para cada tipo: impedir reversões que deixem dados sem referência (um lote sem organização), recalcular o que depende do dado revertido (o status do lote) e permitir apenas a reversão da alteração mais recente de cada registro.

**Data das mudanças de status do lote.** O lote mostra o status atual, mas não desde quando está nele (por exemplo, "em triagem desde 26/11/2026"). Melhoria: guardar a data de cada mudança de status do lote, como já é feito nas movimentações dos equipamentos.