# Documentação do Projeto: Açaiteria Elite Dois Amores

Este documento contém o histórico de criação, configurações de hospedagem, links importantes e todas as credenciais do projeto para consultas futuras.

## 1. Origem e Propósito
Este projeto foi clonado originalmente a partir de um sistema de "Cardápio de Doces Gourmet" e foi inteiramente adaptado, reestilizado e refatorado para se tornar o cardápio digital da **Açaiteria Elite Dois Amores**.

- **Repositório GitHub:** [https://github.com/winchesterrx/cardapiodoisamores.git](https://github.com/winchesterrx/cardapiodoisamores)

## 2. Banco de Dados (Nuvem)
Para garantir que os produtos, pedidos e configurações do administrador funcionem online, o banco de dados MySQL foi migrado de local (SQLite/MySQL local) para a nuvem da **Aiven**.
*(Nota: Para suportar a Aiven, os scripts de criação do banco de dados foram reescritos para incluir `PRIMARY KEY` em todas as tabelas).*

### Credenciais de Conexão Aiven (MySQL)
- **Host (DB_HOST):** `acaidoissabores-acaidoissabores.l.aivencloud.com`
- **Usuário (DB_USER):** `avnadmin`
- **Senha (DB_PASSWORD):** `[REMOVIDO_POR_SEGURANCA]`
- **Nome do Banco (DB_NAME):** `defaultdb`
- **Porta (DB_PORT):** `24593`

## 3. Backend (O "Motor" da Aplicação)
O servidor Node.js/Express, responsável por processar os pedidos, imagens e comunicação com o banco de dados, foi hospedado no **Render.com**.
Não podemos hospedá-lo no Vercel pois o Vercel não suporta upload de arquivos em disco, o que quebraria a adição de imagens via Painel de Admin.

- **Link Base da API:** `https://cardapiodoisamores.onrender.com`
- **Diretório Raiz (Root):** `backend`
- **Comando de Build:** `npm install`
- **Comando de Start:** `node server.js`

### Variáveis de Ambiente no Render (Environment)
Para o Backend funcionar no Render, as seguintes chaves foram adicionadas no painel deles (as mesmas chaves do banco listadas acima, mais as chaves de Notificação Push):
- `DB_HOST`: acaidoissabores-acaidoissabores.l.aivencloud.com
- `DB_USER`: avnadmin
- `DB_PASSWORD`: [REMOVIDO_POR_SEGURANCA]
- `DB_NAME`: defaultdb
- `DB_PORT`: 24593
- `VAPID_PUBLIC_KEY`: BFpExTNFhdYa9CskEmUvJbJeeSCTkLosIbrLLeT6WhbB7vOMxrsG44heXSyd9Z5TLCYoImGgA0ceuBF_argmfKs
- `VAPID_PRIVATE_KEY`: Xm5yOd6737klF-Q46yrRFpGz6DYt2xZdvtVVkZpy1Vo

*(Nota de Segurança: O arquivo `.env` com essas senhas foi apagado propositalmente e inserido no `.gitignore` para não vazar a senha do banco no GitHub público).*

## 4. Frontend (A "Vitrine" / UI do Cliente)
O site em React (Vite) foi hospedado na **Vercel**, que é excelente para velocidade e performance.

- **Variável de Ambiente configurada no Vercel:**
  - **Nome:** `VITE_API_URL`
  - **Valor:** `https://cardapiodoisamores.onrender.com/api`

Isso garante que, quando o cliente abrir o cardápio na Vercel, o site saiba em qual endereço ele deve pedir a lista de produtos (no seu servidor do Render).

## 5. Principais Ajustes de Design e Assets
Ao longo da refatoração, as seguintes alterações foram feitas na Interface:
- **Novos Copos de Açaí:** As imagens dos copos foram substituídas e adicionadas diretamente ao banco de dados:
  - 300ml: `copos_300ml_final_v2.png`
  - 500ml: `copos_500ml_final_v2.png`
  - 700ml: `copos_700ml_final.png`
- **Header e Background (HeroHeader):** O fundo principal do aplicativo foi ajustado. A imagem foi posicionada cortando a parte inferior (`object-[center_65%]`) para empurrar a logo oficial para o topo da tela. 
- **Tags e Slogans:** Foram alinhados absolutamente à base do cabeçalho (`mt-auto` com `justify-end`), possuindo cores da marca (`bg-primary/95` / Roxo) para garantir contraste e destaque sem encobrir o logotipo.
- **Cartões de Produtos:** Tiveram seus tamanhos de imagens expandidos e adicionado fundo branco puro (`bg-white`) com bordas sutis para saltar da tela.

---
**Dica para o Futuro:** Se precisar criar um novo banco de dados no Aiven ou zerar o atual, os scripts de refatoração para banco em nuvem estão dentro da pasta `backend/` com os nomes: `rebuild_db.cjs` e `init_db_fixed.cjs`. Basta executá-los com o Node.
