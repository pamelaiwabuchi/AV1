import type { Interface } from "node:readline/promises";
import { ServicoOrganizacao } from "../../servicos/ServicoOrganizacao.js";
export class TelaOrganizacoes {
    private organizacao: ServicoOrganizacao;
    private terminal: Interface;

    constructor(organizacao: ServicoOrganizacao, terminal: Interface) {
        this.organizacao = organizacao;
        this.terminal = terminal;
    }

    async cadastrar(): Promise<void> {
        const razaoSocial = await this.terminal.question("Razão social: ");
        const cnpj = await this.terminal.question("CNPJ: ");
        const inscricaoEstadual = await this.terminal.question("Inscrição estadual: ");
        const enderecoCompleto = await this.terminal.question("Endereço completo: ");
        const telefone = await this.terminal.question("Telefone: ");
        const email = await this.terminal.question("E-mail: ");

        try {
            const nova = this.organizacao.cadastrarOrganizacao({
                razaoSocial,
                cnpj,
                inscricaoEstadual,
                enderecoCompleto,
                telefone,
                email
            });

            console.log(`Organização cadastrada com o código ${nova.getId()}.`);
        } catch (erro) {
            console.log((erro as Error).message);
        }
    }

    listar(): void {
        const organizacoes = this.organizacao.listarOrganizacoesAtivas();

        if (organizacoes.length === 0) {
            console.log("Nenhuma organização cadastrada.");
            return;
        }

        console.log("Organizações ativas:");

        for (const org of organizacoes) {
            console.log(`  ${org.getId()} - ${org.getRazaoSocial()} - CNPJ ${org.getCnpj()}`);
        }
    }
}