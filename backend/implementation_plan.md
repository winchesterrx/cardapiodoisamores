# Sistema de Rotina de Backups

Este plano descreve como implementaremos a funcionalidade de backups automáticos e manuais do banco de dados (MySQL) para o seu sistema.

## Contexto e Desafios (Importante)
Atualmente o seu banco de dados está na nuvem (Aiven) e o seu backend Node.js aparentemente está hospedado no Render (ou similar). 
Em servidores na nuvem como o Render, o "disco local" é volátil e não é um disco Windows (C:\). Portanto, não podemos simplesmente programar para salvar no "C:\" do seu computador pessoal de forma automática a partir de um servidor na nuvem. 

Para resolver isso de forma eficiente e profissional, proponho as seguintes soluções:

## Proposta de Solução

### 1. Botão de "Baixar Backup Agora" (Manual)
Criaremos um botão no painel Admin. Ao clicar, o sistema fará um dump (cópia completa) do banco de dados MySQL na hora e iniciará o download de um arquivo `.sql` diretamente para a sua máquina local (onde você estiver acessando o site, seja no celular ou PC). Isso resolve a parte de ter o backup no seu computador de forma fácil.

### 2. Rotina Automática por Email (Agendado)
Para a rotina automática, o método mais seguro e prático sem precisar de configurações complexas (como integrações avançadas com o Google Drive que exigem criação de aplicativos no Google Cloud) é o **Envio por E-mail**.
- Você configurará no painel Admin o horário (ex: "Todo dia às 03:00 da manhã").
- Você definirá o e-mail que receberá o backup.
- O sistema usará um serviço de e-mail (Nodemailer) para gerar o arquivo `.sql` no horário marcado e enviar automaticamente para a sua caixa de entrada. (Você pode até configurar uma regra no Gmail para salvar esses anexos no Google Drive automaticamente).

## Open Questions

> [!IMPORTANT]
> Preciso que você responda essas perguntas antes de começarmos:
> 1. Você concorda com a abordagem de **Baixar Manualmente** e **Receber Automático por E-mail**?
> 2. Se formos usar o envio automático por e-mail, você tem uma conta do Gmail ou outro serviço que possamos usar para enviar esses e-mails (precisaremos gerar uma senha de aplicativo/app password)?
> 3. Você faz questão da integração nativa com o Google Drive? (Aviso: Ela exige que você crie um projeto no Google Cloud, gere chaves de API e configure telas de permissão, o que é um processo bem mais longo e técnico).

## Proposed Changes

### Backend (`server.js` e pacote `node-cron`)
- **[MODIFY] `backend/package.json`**: Adicionar pacotes `node-cron` (para agendamento), `mysqldump` (para extrair os dados do Aiven) e `nodemailer` (para envio de emails).
- **[MODIFY] `backend/server.js`**:
  - Nova rota `GET /api/backups/download` para retornar o backup sob demanda.
  - Nova rota `POST /api/backups/settings` para salvar as configurações de horário e email do administrador.
  - Implementação da rotina cronometrada para enviar o e-mail no horário configurado.
- **[MODIFY] `backend/update-db-v2.js`**: Adicionar uma tabela `backup_settings` no banco para salvar as preferências do cliente.

### Frontend (`Admin.tsx` e `menuData.ts`)
- **[MODIFY] `src/pages/Admin.tsx`**: Adicionar uma aba "Backups" em Configurações. Conterá:
  - Botão de "Baixar Backup Manual".
  - Formulário para habilitar/desabilitar Backup Automático.
  - Campo para definir o Horário.
  - Campo para definir o E-mail de destino.
- **[MODIFY] `src/data/menuData.ts`**: Adicionar as chamadas de API (`fetch`) para se comunicar com as rotas de backup.

## Verification Plan

### Testes Manuais
- Acessar o painel Admin e testar o download manual do arquivo `.sql`. Abrir o arquivo para garantir que as tabelas estão lá.
- Configurar um horário de backup automático para "daqui a 2 minutos" e verificar se o e-mail chega corretamente com o anexo do banco de dados.
