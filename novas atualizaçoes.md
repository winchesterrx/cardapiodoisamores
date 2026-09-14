# Plano de Implementação: Novas Atualizações

## 1. Restrição de Adicionais em "Combinados"
**Problema:** Atualmente, pedidos do tipo "combinados" permitem a adição de outros adicionais além daqueles que já fazem parte da combinação, o que pode gerar prejuízo ou confusão.
**Solução Proposta:**
- Modificar o `ProductModal.tsx` ou o fluxo de carrinho para que, se a propriedade `isCombinado` (ou a categoria correspondente) for verdadeira, a seção de adicionais extras fique oculta ou desabilitada.
- **Dúvida:** Os "Combinados" têm uma categoria específica no painel (ex: `category === 'combinados'`) ou uma flag no banco de dados (`isCombinado: true`)? Precisamos confirmar qual é a regra para identificar um produto como combinado no sistema.

## 2. Notificações Push em Segundo Plano (Background)
**Problema:** O Admin não apita e não notifica no celular se o navegador estiver minimizado.
**Solução Proposta:**
- Configurar corretamente o `public/sw.js` (Service Worker) que está rodando. O Service Worker é a única forma de interceptar eventos push no celular quando a aba está em segundo plano.
- Checar se estamos chamando a API `self.registration.showNotification` dentro do evento `push` no `sw.js`.
- Testar e confirmar se a requisição que dispara o Push pelo Backend (`server.js`) está enviando a notificação via protocolo Web Push (VAPID).

## 3. Sistema de Backup de Dados
**Problema:** Risco de perda de dados.
**Solução Proposta:**
- Adicionar uma rota no backend (`/api/admin/backup`) que consolide todos os pedidos, produtos, configurações e categorias em um arquivo JSON (ou CSV, se preferir).
- Adicionar um botão no painel de Configurações do Admin ("Fazer Backup de Segurança") que baixe esse arquivo diretamente para o celular/computador.

## 4. Correção de Duplicação de Pedidos do iFood
**Problema:** Os pedidos importados do iFood parecem estar sendo duplicados na tela do Admin.
**Solução Proposta:**
- Investigar o webhook do iFood ou a função de integração. Quando um pedido do iFood é criado, verificar se já existe um pedido com o mesmo `orderId` ou `ifoodId` no banco de dados local.
- Adicionar uma restrição (upsert) na hora de salvar o pedido para não recriar a mesma via caso o iFood envie o evento (ex: *Placed* e *Confirmed*) múltiplas vezes rapidamente.

---

> **Aprovação Necessária**
> Revise este documento. Se você aprovar, irei começar a execução por partes.
> 
> Me responda:
> 1. Como identificamos no sistema se um produto é um "Combinado"? (É pelo nome da categoria?)
