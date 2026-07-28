# Atualização do Sistema: Entregadores, PDV e Comandas

Este plano detalha a implementação das 3 funcionalidades solicitadas: Gestão de Entregadores com Login, Impressão de Comandas e PDV (Ponto de Venda) para o Balcão. 

Como esta é uma mudança estrutural grande no sistema (exigindo controle de acesso e usuários), separei os detalhes abaixo para garantir que estamos perfeitamente alinhados antes de eu escrever o código.

## 1. Gestão de Entregadores (Com Login e Painel)
Vamos criar um sistema real de usuários com níveis de acesso (`admin` e `entregador`).

- **Banco de Dados**: Criação da tabela `users` (nome, telefone, senha, tipo de acesso, taxa por entrega) e adição da coluna `courier_id` na tabela `orders`.
- **Backend**: Implementação de sistema de autenticação segura (Login com Senha) usando Tokens.
- **Frontend - Login**: Uma nova página de Login (`/login`). Se for Admin, vai para o painel de sempre. Se for Entregador, vai para o painel restrito dele.
- **Frontend - Painel do Entregador**: O motoboy terá uma tela no celular dele onde poderá ver:
  - Pedidos despachados para ele hoje (com endereço clicável para abrir no Maps e telefone para abrir no WhatsApp).
  - Histórico e Resumo Financeiro (Hoje, Ontem, Últimos 7 dias). Ex: "15 entregas feitas. Total a receber: R$ 120,00".
- **Frontend - Painel Admin**: Uma nova aba "Entregadores" onde você cadastra os motoboys, define a taxa fixa de entrega de cada um e visualiza o relatório de acerto do dia. No painel de Pedidos, você terá um botão para "Despachar com: [Nome do Entregador]".

## 2. Ponto de Venda (PDV / Balcão)
Para que você não precise misturar anotações em papel com o sistema online.

- **Frontend - Painel Admin**: Uma nova aba "Frente de Caixa (PDV)".
- **Funcionamento**: Será uma tela otimizada para quem está no caixa do restaurante. Você clica nos produtos, escolhe opcionais, aplica descontos, define se o cliente vai pagar no Dinheiro/Cartão/Pix e fecha o pedido imediatamente.
- **Integração**: Esses pedidos entrarão no sistema com a tag "Origem: Balcão" e irão aparecer nos mesmos relatórios que criamos hoje mais cedo, centralizando 100% do seu faturamento.

## 3. Impressão Térmica de Comandas (Cozinha)
Para agilizar a produção na cozinha.

- **Funcionamento**: Ao abrir os detalhes de um pedido no Painel Admin, haverá um botão **"🖨️ Imprimir Comanda"**.
- **Layout**: Criaremos uma página oculta formatada especificamente em formato de cupom (80mm ou 58mm, preto e branco, fonte limpa e grande para a cozinha ler fácil).
- Ao clicar no botão, ele abrirá a tela de impressão do seu sistema operacional perfeitamente ajustada para a maquininha térmica.

---

> [!WARNING]  
> **Alterações Críticas e Segurança**
> Atualmente seu painel `/admin` é aberto (qualquer pessoa com o link pode acessar). Com a implementação de usuários, passará a existir uma **Tela de Login**. Eu criarei um usuário de administrador padrão (ex: seu telefone e uma senha) para você entrar a primeira vez e poder cadastrar os entregadores.

> [!IMPORTANT]  
> **Questões Abertas (Preciso da sua resposta antes de começar):**
> 1. A taxa do entregador é um **valor fixo por entrega** (ex: R$ 8,00 todas as entregas) ou **varia de acordo com o pedido/bairro**? O sistema assumirá valor fixo por entregador se você não especificar.
> 2. Podemos adicionar as bibliotecas `jsonwebtoken` (para segurança do login) e `bcrypt` (criptografia de senha) no servidor? (Isso é o padrão mundial).

## Plano de Execução
1. Atualizar o banco de dados (novo script de migração `update-db-v3.js`).
2. Criar rotas de Login, Usuários e o novo modelo de Pedidos no backend.
3. Criar a interface de Autenticação e proteger as rotas no React.
4. Construir o Painel do Entregador (`/entregador`).
5. Construir o PDV na visão do Admin.
6. Construir a tela de Impressão Térmica 80mm.

**Aguardando sua revisão! Se estiver de acordo, é só clicar em "Proceed" e eu iniciarei o trabalho imediatamente.**
