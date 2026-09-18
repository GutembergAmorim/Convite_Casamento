# 📖 INSTRUÇÕES DE CONFIGURAÇÃO
## Site de Casamento com Painel Admin

---

## 📁 Arquivos do projeto

| Arquivo | O que é |
|---|---|
| `index.html` | Site público dos convidados |
| `style.css` | Visual do site |
| `script.js` | Lógica do site |
| `admin.html` | Painel dos noivos |
| `admin.css` | Visual do painel |
| `admin.js` | Lógica do painel |
| `casamento-apps-script.gs` | Código do servidor (Google) |

---

## 🚀 PASSO A PASSO DE CONFIGURAÇÃO

### PASSO 1 — Criar a Planilha Google Sheets

1. Acesse: https://sheets.google.com
2. Crie uma nova planilha
3. Copie o **ID da planilha** da URL:
   - URL: `https://docs.google.com/spreadsheets/d/`**[ID AQUI]**`/edit`
   - Copie apenas o trecho entre `/d/` e `/edit`

---

### PASSO 2 — Criar o Apps Script

1. Acesse: https://script.google.com
2. Clique em **"Novo projeto"**
3. Apague o código existente
4. Copie e cole TODO o conteúdo do arquivo `casamento-apps-script.gs`
5. Na linha `const SPREADSHEET_ID = 'COLE_O_ID_DA_SUA_PLANILHA_AQUI';`
   → substitua pelo ID que você copiou no Passo 1
6. Clique no ícone de **Salvar** (💾)

---

### PASSO 3 — Criar as abas da planilha

1. Ainda no Apps Script, clique em **"Executar"**
2. No menu suspenso de funções, selecione **`criarPlanilhaInicial`**
3. Clique em **Executar** (▶️)
4. Autorize o acesso quando solicitado (clique em "Avançado" → "Continuar")
5. A planilha será criada com todas as abas e dados padrão ✅

---

### PASSO 4 — Implantar como Aplicativo Web

1. No Apps Script, clique em **"Implantar"** → **"Nova implantação"**
2. Clique no ícone de engrenagem ⚙️ ao lado de "Tipo" → selecione **"Aplicativo da Web"**
3. Configure:
   - **Descrição:** Casamento Site
   - **Executar como:** Eu (seu e-mail)
   - **Quem tem acesso:** Qualquer pessoa
4. Clique em **"Implantar"**
5. Autorize novamente se pedido
6. **COPIE A URL** gerada — ela será algo como:
   `https://script.google.com/macros/s/ABC123.../exec`

---

### PASSO 5 — Colar a URL nos arquivos do site

Abra **`script.js`** e substitua na linha 3:
```
const SCRIPT_URL = "COLE_A_URL_DO_APPS_SCRIPT_AQUI";
```
pela URL copiada.

Faça o mesmo em **`admin.js`** na linha 3.

---

### PASSO 6 — Publicar no Netlify

1. Acesse: https://netlify.com → faça login
2. Clique em **"Add new site"** → **"Deploy manually"**
3. Arraste a pasta `casamento-site` para a área indicada
4. Aguarde o deploy (1-2 minutos)
5. Pronto! Seu site estará no ar 🎉

---

## 🔐 Acessar o Painel dos Noivos

- URL do painel: `https://seu-site.netlify.app/admin.html`
- **Senha padrão:** `casamento2026`
- Para alterar a senha: entre no painel → aba **🔐 Acesso**

---

## ✏️ O que pode ser editado pelo painel

| Aba | Campos |
|---|---|
| 🎊 Geral | Nomes dos noivos, frase de abertura, assinatura do rodapé |
| 📅 Evento | Data, hora, local, endereço, links do Google Maps |
| 💌 História | Texto "Nossa História" |
| 💰 PIX | Chave PIX e nome do titular |
| 🎁 Presentes | Adicionar/remover categorias e itens |
| ✅ Confirmações | Ver lista de quem confirmou presença |
| 🔐 Acesso | Alterar senha do painel |

---

## ❓ Perguntas Frequentes

**As edições aparecem em tempo real?**
Sim! Assim que você salvar no painel, o site é atualizado para todos os convidados em segundos.

**Preciso republicar no Netlify quando editar?**
Não! O Netlify hospeda os arquivos HTML/CSS/JS que não mudam. Os dados ficam no Google Sheets e são carregados ao abrir o site.

**E se der erro de CORS?**
Certifique-se de que a implantação do Apps Script está configurada como "Qualquer pessoa" no campo "Quem tem acesso".

**Como redeploiar após atualizar os arquivos HTML/CSS/JS?**
No Netlify → Sites → seu site → Deploys → arraste a pasta novamente.
