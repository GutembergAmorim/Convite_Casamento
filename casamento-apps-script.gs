// ============================================
// CASAMENTO — GOOGLE APPS SCRIPT
// Versão 2.0
//
// COMO USAR:
// 1. Acesse script.google.com
// 2. Cole este código em um novo projeto
// 3. Substitua SPREADSHEET_ID pelo ID da sua planilha
// 4. Execute criarPlanilhaInicial() UMA vez para criar as abas
// 5. Clique em Implantar → Nova implantação → Aplicativo Web
//    - Executar como: Eu
//    - Quem tem acesso: Qualquer pessoa
// 6. Copie a URL gerada e cole em script.js e admin.js
// ============================================

const SPREADSHEET_ID = '15ZL498QGKSQ7rmS9qAkgJhDOjNVYPoCwYVnzxe7qwC0';

// --------------------------------------------
// ENDPOINTS PRINCIPAIS
// --------------------------------------------
function doGet(e) {
    const acao = (e && e.parameter && e.parameter.acao) ? e.parameter.acao : 'getPresentes';
    let result;

    try {
        switch (acao) {
            case 'getConfig':       result = getConfig();       break;
            case 'getPresentes':    result = getPresentes();    break;
            case 'getConfirmacoes': result = getConfirmacoes(); break;
            default:                result = { error: 'Acao desconhecida: ' + acao };
        }
    } catch(err) {
        result = { error: err.message };
    }

    return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
    let result;

    try {
        const params = e.parameter;
        const acao = params.acao;

        // Verificar senha para operações de escrita
        if (acao === 'salvarConfig' || acao === 'salvarPresentes') {
            const cfg = getConfig();
            const senhaCorreta = cfg.senhaAdmin || 'casamento2026';
            if (params.senhaAdmin !== senhaCorreta) {
                return ContentService
                    .createTextOutput(JSON.stringify({ success: false, message: 'Senha incorreta.' }))
                    .setMimeType(ContentService.MimeType.JSON);
            }
        }

        switch (acao) {
            case 'salvarConfig':    result = salvarConfig(params);            break;
            case 'salvarPresentes': result = salvarPresentes(params.dados);   break;
            case 'confirmar':       result = confirmar(params);               break;
            default:                result = { success: false, message: 'Acao desconhecida: ' + acao };
        }
    } catch(err) {
        result = { success: false, message: err.message };
    }

    return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
}

// --------------------------------------------
// GET CONFIG
// --------------------------------------------
function getConfig() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Config');
    if (!sheet) return getDefaultConfig();

    const rows = sheet.getDataRange().getValues();
    const cfg = {};
    rows.forEach(r => { if (r[0]) cfg[r[0]] = r[1] !== undefined ? String(r[1]) : ''; });

    return cfg;
}

function getDefaultConfig() {
    return {
        nomes: 'Felipe & Wanessa',
        assinaturaRodape: 'Com muito amor, Felipe & Wanessa',
        chavePix: '(88) 99716-1064',
        nomeTitularPix: 'Francisco Felipe',
        paleta: 'dourado',
        fonteTitulo: 'Playfair Display',
        fonteCorpo: 'Montserrat',
        senhaAdmin: 'casamento2026',
        heroFoto: ''
    };
}

// --------------------------------------------
// SALVAR CONFIG
// --------------------------------------------
function salvarConfig(params) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Config');
    if (!sheet) sheet = ss.insertSheet('Config');

    sheet.clearContents();

    const campos = [
        'nomes', 'assinaturaRodape', 'chavePix', 'nomeTitularPix',
        'paleta', 'fonteTitulo', 'fonteCorpo',
        'heroFoto', 'senhaAdmin'
    ];

    // senhaAdmin_valor tem prioridade para alterar a senha
    const senhaFinal = params.senhaAdmin_valor || params.senhaAdmin || 'casamento2026';

    const rows = campos.map(c => {
        if (c === 'senhaAdmin') return ['senhaAdmin', senhaFinal];
        return [c, params[c] !== undefined ? params[c] : ''];
    });

    sheet.getRange(1, 1, rows.length, 2).setValues(rows);
    return { success: true, message: 'Configurações salvas!' };
}

// --------------------------------------------
// GET PRESENTES
// --------------------------------------------
function getPresentes() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Presentes');
    if (!sheet) return getDefaultPresentes();

    const rows = sheet.getDataRange().getValues();
    const result = [];

    // Pula linha de cabeçalho (linha 1)
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (r[0] && r[2]) { // categoria e item são obrigatórios
            result.push({
                categoria: String(r[0]),
                emoji:     String(r[1] || '🎁'),
                item:      String(r[2]),
                itemEmoji: String(r[3] || '✨'),
                foto:      String(r[4] || ''),
                reservado: r[5] === true || String(r[5]).toLowerCase() === 'true'
            });
        }
    }

    return result;
}

function getDefaultPresentes() {
    return [
        { categoria: 'Para a Cozinha',    emoji: '👨‍🍳', item: 'Air Fryer',                     itemEmoji: '🍟' },
        { categoria: 'Para a Cozinha',    emoji: '👨‍🍳', item: 'Panela de arroz elétrica',       itemEmoji: '🍚' },
        { categoria: 'Para a Cozinha',    emoji: '👨‍🍳', item: 'Panela de pressão elétrica',     itemEmoji: '🥘' },
        { categoria: 'Para a Cozinha',    emoji: '👨‍🍳', item: 'Jogo americano',                 itemEmoji: '🍽️' },
        { categoria: 'Para a Cozinha',    emoji: '👨‍🍳', item: 'Jogo de panelas grande',         itemEmoji: '🥘' },
        { categoria: 'Para a Cozinha',    emoji: '👨‍🍳', item: 'Chaleira elétrica',              itemEmoji: '☕' },
        { categoria: 'Para a Cozinha',    emoji: '👨‍🍳', item: 'Jogo de tapetes para cozinha',   itemEmoji: '🏠' },
        { categoria: 'Para a Cozinha',    emoji: '👨‍🍳', item: 'Jogo de sousplat',               itemEmoji: '🍽️' },
        { categoria: 'Para a Cozinha',    emoji: '👨‍🍳', item: 'Processador de alimentos',      itemEmoji: '🥗' },
        { categoria: 'Para a Cozinha',    emoji: '👨‍🍳', item: 'Cafeteira elétrica',             itemEmoji: '☕' },
        { categoria: 'Eletrodomésticos',  emoji: '🔌',  item: 'Ventilador',                    itemEmoji: '💨' },
        { categoria: 'Eletrodomésticos',  emoji: '🔌',  item: 'Tanquinho',                     itemEmoji: '🧺' },
        { categoria: 'Eletrodomésticos',  emoji: '🔌',  item: 'Aspirador de pó',               itemEmoji: '🧹' },
        { categoria: 'Eletrodomésticos',  emoji: '🔌',  item: 'Televisão para sala',           itemEmoji: '📺' },
        { categoria: 'Eletrodomésticos',  emoji: '🔌',  item: 'Máquina de lavar',              itemEmoji: '🫧' },
        { categoria: 'Eletrodomésticos',  emoji: '🔌',  item: 'Ar-condicionado',               itemEmoji: '❄️' },
        { categoria: 'Outros Itens',      emoji: '🏠',  item: 'Rede de varanda',               itemEmoji: '😴' },
        { categoria: 'Outros Itens',      emoji: '🏠',  item: 'Jogo de tapetes para banheiro', itemEmoji: '🛁' },
        { categoria: 'Outros Itens',      emoji: '🏠',  item: 'Jogo de toalhas para o casal',  itemEmoji: '🛁' }
    ];
}

// --------------------------------------------
// SALVAR PRESENTES
// --------------------------------------------
function salvarPresentes(jsonString) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Presentes');
    if (!sheet) sheet = ss.insertSheet('Presentes');

    sheet.clearContents();

    // Cabeçalho com 6 colunas
    sheet.getRange(1, 1, 1, 6).setValues([['categoria', 'emoji', 'item', 'itemEmoji', 'foto', 'reservado']]);

    const presentes = JSON.parse(jsonString);
    if (presentes && presentes.length > 0) {
        const rows = presentes.map(p => [
            p.categoria || '',
            p.emoji || '🎁',
            p.item || '',
            p.itemEmoji || '✨',
            p.foto || '',
            p.reservado === true || String(p.reservado).toLowerCase() === 'true' ? true : false
        ]);
        sheet.getRange(2, 1, rows.length, 6).setValues(rows);
    }

    return { success: true, message: 'Lista de presentes salva!' };
}

// --------------------------------------------
// CONFIRMAR PRESENÇA
// --------------------------------------------
function confirmar(params) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Confirmacoes');

    if (!sheet) {
        sheet = ss.insertSheet('Confirmacoes');
        sheet.getRange(1, 1, 1, 4).setValues([['nome', 'pessoas', 'presentes', 'data']]);
    }

    const now = new Date();
    const dataHora = Utilities.formatDate(now, 'America/Fortaleza', 'dd/MM/yyyy HH:mm');
    const lastRow = sheet.getLastRow() + 1;

    sheet.getRange(lastRow, 1, 1, 4).setValues([[
        params.nome || '',
        params.pessoas || '',
        params.presentes || '',
        dataHora
    ]]);

    // Marcar itens escolhidos como reservados na planilha de Presentes
    if (params.presentes && params.presentes !== 'Nenhum') {
        try {
            const presentesSheet = ss.getSheetByName('Presentes');
            if (presentesSheet && presentesSheet.getLastRow() > 1) {
                const chosenItems = params.presentes.split(',').map(s => s.trim().toLowerCase());
                const presRows = presentesSheet.getRange(2, 1, presentesSheet.getLastRow() - 1, 6).getValues();
                presRows.forEach((r, idx) => {
                    const itemName = String(r[2]).trim().toLowerCase();
                    if (chosenItems.includes(itemName)) {
                        presentesSheet.getRange(idx + 2, 6).setValue(true);
                    }
                });
            }
        } catch(e) {
            Logger.log('Erro ao marcar reservados: ' + e.message);
        }
    }

    return { success: true, message: 'Presença confirmada com sucesso!' };
}

// --------------------------------------------
// GET CONFIRMAÇÕES (para o painel admin)
// --------------------------------------------
function getConfirmacoes() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Confirmacoes');
    if (!sheet) return [];

    const rows = sheet.getDataRange().getValues();
    const result = [];

    // Pula linha de cabeçalho
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (r[0]) {
            result.push({ nome: r[0], pessoas: r[1], presentes: r[2], data: r[3] });
        }
    }

    return result;
}

// --------------------------------------------
// CRIAR PLANILHA INICIAL (execute 1x no início)
// --------------------------------------------
function criarPlanilhaInicial() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // === ABA CONFIG ===
    let configSheet = ss.getSheetByName('Config');
    if (!configSheet) configSheet = ss.insertSheet('Config');
    configSheet.clearContents();

    const cfgData = getDefaultConfig();
    const cfgRows = Object.entries(cfgData).map(([k, v]) => [k, v]);
    configSheet.getRange(1, 1, cfgRows.length, 2).setValues(cfgRows);
    configSheet.getRange(1, 1, cfgRows.length, 1).setFontWeight('bold');
    configSheet.setColumnWidth(1, 200);
    configSheet.setColumnWidth(2, 500);

    // === ABA PRESENTES ===
    let presentesSheet = ss.getSheetByName('Presentes');
    if (!presentesSheet) presentesSheet = ss.insertSheet('Presentes');
    presentesSheet.clearContents();

    const presHeader = [['categoria', 'emoji', 'item', 'itemEmoji', 'foto', 'reservado']];
    const presDefault = getDefaultPresentes().map(p => [p.categoria, p.emoji, p.item, p.itemEmoji, p.foto || '', p.reservado || false]);
    const presData = presHeader.concat(presDefault);
    presentesSheet.getRange(1, 1, presData.length, 6).setValues(presData);
    presentesSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#2d5016').setFontColor('white');

    // === ABA CONFIRMAÇÕES ===
    let confSheet = ss.getSheetByName('Confirmacoes');
    if (!confSheet) confSheet = ss.insertSheet('Confirmacoes');
    confSheet.clearContents();
    confSheet.getRange(1, 1, 1, 4).setValues([['nome', 'pessoas', 'presentes', 'data']]);
    confSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#2d5016').setFontColor('white');

    Logger.log('✅ Planilha criada com sucesso! Agora: 1. Implante como Aplicativo Web  2. Copie a URL  3. Cole em script.js e admin.js');
}
