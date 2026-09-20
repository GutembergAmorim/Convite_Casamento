const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGC-yXZRS16A1mfQo1EfgBrT31XCE4B0aDPLQToV5qoWXBgT-SqeBuVOrjOPDUolkqaA/exec";

// ============================================
// PALETAS E FONTES
// ============================================
const PALETTES = {
    dourado:    { label:'Dourado Clássico',  preview:['#0a1128','#d4af37'] },
    rose:       { label:'Rosa Rosê',         preview:['#1a0c10','#c9847a'] },
    esmeralda:  { label:'Verde Esmeralda',   preview:['#081a10','#5fa882'] },
    vinho:      { label:'Vinho & Ouro',      preview:['#1a0508','#c4954a'] },
    safira:     { label:'Azul Safira',       preview:['#080a1a','#8baed4'] },
    bronze:     { label:'Nude & Bronze',     preview:['#1a120a','#c89060'] }
};

const FONTS = {
    'Playfair Display':    { desc:'Clássica & Elegante' },
    'Great Vibes':         { desc:'Cursiva Romântica' },
    'Cormorant Garamond':  { desc:'Refinada & Sofisticada' },
    'Lora':                { desc:'Clássica Moderna' },
    'Josefin Sans':        { desc:'Moderna & Limpa' },
    'Dancing Script':      { desc:'Caligrafia Delicada' }
};

const BODY_FONTS = {
    'Montserrat':          { desc:'Moderna & Legível' },
    'Lora':                { desc:'Clássica Moderna' },
    'Josefin Sans':        { desc:'Leve & Elegante' },
    'Cormorant Garamond':  { desc:'Refinada' },
    'Dancing Script':      { desc:'Caligrafia' },
    'Playfair Display':    { desc:'Clássica' }
};

let currentConfig = {};
let giftsData = [];
let currentPassword = '';

// ============================================
// LOGIN E INICIALIZAÇÃO
// ============================================
async function doLogin() {
    const pw = document.getElementById('login-password').value.trim();
    const errEl = document.getElementById('login-error');
    if (!pw) { errEl.textContent = 'Digite a senha.'; return; }
    errEl.textContent = '⏳ Verificando...';
    try {
        const res = await fetch(`${SCRIPT_URL}?acao=getConfig`);
        const cfg = await res.json();
        if (cfg.error) throw new Error(cfg.error);
        if (pw !== (cfg.senhaAdmin || 'casamento2026')) { errEl.textContent = '❌ Senha incorreta.'; return; }
        currentPassword = pw;
        currentConfig = cfg;
        errEl.textContent = '';
        showPanel(cfg);
    } catch(e) { errEl.textContent = '⚠️ Erro: ' + e.message; }
}

function doLogout() {
    currentConfig={}; giftsData=[]; currentPassword='';
    document.getElementById('login-password').value='';
    document.getElementById('login-error').textContent='';
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('admin-panel').classList.add('hidden');
}

function showPanel(cfg) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    const hc = document.getElementById('header-couple');
    if (hc) hc.textContent = cfg.nomes || 'Casamento';
    fillConfigFields(cfg);
    buildPaletteGrid();
    buildFontGrids();
    restoreAppearance(cfg);
    loadGiftsAdmin();
}

function fillConfigFields(cfg) {
    ['nomes','assinaturaRodape','chavePix','nomeTitularPix','heroFoto'].forEach(k => {
        const el = document.getElementById('cfg-'+k);
        if (el) el.value = cfg[k] || '';
    });
}

// ============================================
// SALVAR CONFIG & SENHA
// ============================================
async function saveConfig() {
    const campos = ['nomes','assinaturaRodape','chavePix','nomeTitularPix','paleta','fonteTitulo','fonteCorpo','heroFoto'];

    const params = new URLSearchParams({ acao:'salvarConfig', senhaAdmin:currentPassword, senhaAdmin_valor:currentPassword });
    campos.forEach(k => {
        const el = document.getElementById('cfg-'+k);
        if (el) params.append(k, el.type==='checkbox' ? el.checked : (el.value||''));
    });

    const tabs = ['geral','pix','aparencia'];
    tabs.forEach(t => showSaveStatus(t,'loading'));
    try {
        const res = await fetch(SCRIPT_URL,{ method:'POST', body:params, headers:{'Content-Type':'application/x-www-form-urlencoded'} });
        const result = await res.json();
        if (result.success) {
            tabs.forEach(t => showSaveStatus(t,'success','✅ Salvo!'));
            const hc = document.getElementById('header-couple');
            if (hc) hc.textContent = document.getElementById('cfg-nomes')?.value || 'Casamento';
        } else throw new Error(result.message||'Erro');
    } catch(e) { tabs.forEach(t => showSaveStatus(t,'error','❌ '+e.message)); }
}

async function saveSenha() {
    const nova = document.getElementById('cfg-senhaAdmin').value.trim();
    const confirma = document.getElementById('cfg-senhaConfirm').value.trim();
    if (!nova) { showSaveStatus('acesso','error','❌ Digite a nova senha.'); return; }
    if (nova !== confirma) { showSaveStatus('acesso','error','❌ As senhas não coincidem.'); return; }
    if (nova.length < 4) { showSaveStatus('acesso','error','❌ Mínimo 4 caracteres.'); return; }
    
    showSaveStatus('acesso','loading');
    try {
        const campos = ['nomes','assinaturaRodape','chavePix','nomeTitularPix','paleta','fonteTitulo','fonteCorpo','heroFoto'];
        const params = new URLSearchParams({ acao:'salvarConfig', senhaAdmin:currentPassword, senhaAdmin_valor:nova });
        campos.forEach(k=>{ const el=document.getElementById('cfg-'+k); if(el) params.append(k,el.type==='checkbox'?el.checked:(el.value||'')); });
        const res = await fetch(SCRIPT_URL,{ method:'POST', body:params, headers:{'Content-Type':'application/x-www-form-urlencoded'} });
        const r = await res.json();
        if (r.success) { currentPassword=nova; showSaveStatus('acesso','success','✅ Senha alterada!'); document.getElementById('cfg-senhaAdmin').value=''; document.getElementById('cfg-senhaConfirm').value=''; }
        else throw new Error(r.message);
    } catch(e) { showSaveStatus('acesso','error','❌ '+e.message); }
}

// ============================================
// APARÊNCIA — PALETAS E FONTES
// ============================================
function buildPaletteGrid() {
    const grid = document.getElementById('palette-grid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.entries(PALETTES).forEach(([key, pal]) => {
        const div = document.createElement('div');
        div.className = 'palette-opt';
        div.dataset.palette = key;
        div.innerHTML = `<div class="palette-swatch"><div class="palette-swatch-bg" style="background:${pal.preview[0]}"></div><div class="palette-swatch-ac" style="background:${pal.preview[1]}"></div></div><div class="palette-name">${pal.label}</div>`;
        div.onclick = () => selectPalette(key);
        grid.appendChild(div);
    });
}
function selectPalette(key) {
    document.querySelectorAll('.palette-opt').forEach(el => el.classList.remove('selected'));
    const opt = document.querySelector(`.palette-opt[data-palette="${key}"]`);
    if (opt) opt.classList.add('selected');
    const hidden = document.getElementById('cfg-paleta');
    if (hidden) hidden.value = key;
}

function buildFontGrids() {
    buildFontGrid('font-title-grid', FONTS, 'cfg-fonteTitulo', 'title');
    buildFontGrid('font-body-grid', BODY_FONTS, 'cfg-fonteCorpo', 'body');
}
function buildFontGrid(containerId, fontMap, hiddenId, type) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    Object.entries(fontMap).forEach(([name, info]) => {
        const div = document.createElement('div');
        div.className = 'font-opt';
        div.dataset.font = name;
        div.dataset.type = type;
        const fontCss = `'${name}', ${name.includes('Vibes')||name.includes('Script')||name.includes('Garamond')||name.includes('Playfair')||name.includes('Lora')?'serif':'sans-serif'}`;
        div.innerHTML = `<span class="font-sample" style="font-family:${fontCss}">Aa</span><span class="font-label">${name}</span><span class="font-desc">${info.desc}</span>`;
        div.onclick = () => selectFont(name, type, hiddenId);
        grid.appendChild(div);
    });
}
function selectFont(name, type, hiddenId) {
    document.querySelectorAll(`.font-opt[data-type="${type}"]`).forEach(el => el.classList.remove('selected'));
    const opt = document.querySelector(`.font-opt[data-type="${type}"][data-font="${name}"]`);
    if (opt) opt.classList.add('selected');
    const hidden = document.getElementById(hiddenId);
    if (hidden) hidden.value = name;
}

function restoreAppearance(cfg) {
    selectPalette(cfg.paleta || 'dourado');
    selectFont(cfg.fonteTitulo || 'Playfair Display', 'title', 'cfg-fonteTitulo');
    selectFont(cfg.fonteCorpo || 'Montserrat', 'body', 'cfg-fonteCorpo');

    // Restaurar foto do hero
    const heroInput = document.getElementById('cfg-heroFoto');
    if (heroInput && cfg.heroFoto) {
        heroInput.value = cfg.heroFoto;
        previewHeroFoto();
    }
}

// ============================================
// HERO FOTO — Preview ao vivo
// ============================================
function previewHeroFoto() {
    const input = document.getElementById('cfg-heroFoto');
    const box = document.getElementById('hero-foto-preview-box');
    const img = document.getElementById('hero-foto-preview-img');
    const empty = document.getElementById('hero-foto-preview-empty');
    if (!input || !box || !img || !empty) return;

    const url = input.value.trim();
    if (!url) {
        box.style.display = 'none';
        return;
    }

    const converted = driveUrl(url);
    box.style.display = 'block';

    if (converted) {
        img.src = converted;
        img.style.display = 'block';
        empty.style.display = 'none';
        img.onerror = () => {
            img.style.display = 'none';
            empty.textContent = '⚠️ Não foi possível carregar a imagem. Verifique se o link é público.';
            empty.style.display = 'block';
        };
    } else {
        img.style.display = 'none';
        empty.textContent = 'Link inválido. Use um link do Google Drive ou uma URL direta de imagem.';
        empty.style.display = 'block';
    }
}

// ============================================
// PRESENTES & CONFIRMAÇÕES
// ============================================
async function loadGiftsAdmin() {
    const editor = document.getElementById('gift-editor');
    editor.innerHTML = '<p style="color:#666;padding:20px">🔄 Carregando...</p>';
    try {
        const res = await fetch(`${SCRIPT_URL}?acao=getPresentes`);
        giftsData = await res.json();
        if (!Array.isArray(giftsData)) giftsData = [];
        renderGiftEditor();
    } catch(e) { editor.innerHTML = `<p style="color:red;padding:20px">❌ ${e.message}</p>`; }
}
function renderGiftEditor() {
    const editor = document.getElementById('gift-editor');
    editor.innerHTML = '';
    const catOrder=[], catMap={}, catEmoji={};
    giftsData.forEach(it => {
        if (!catMap[it.categoria]) { catMap[it.categoria]=[]; catEmoji[it.categoria]=it.emoji||'🎁'; catOrder.push(it.categoria); }
        catMap[it.categoria].push({ item:it.item, itemEmoji:it.itemEmoji||'✨', foto:it.foto||'' });
    });
    catOrder.forEach(cat => editor.appendChild(buildCategoryBlock(cat, catEmoji[cat], catMap[cat])));
}
// Converte link do Google Drive em URL direta para imagem
function driveUrl(url) {
    if (!url || url.trim() === '') return '';
    let id = null;
    const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) id = m1[1];
    if (!id) { const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/); if (m2) id = m2[1]; }
    if (!id) { const m3 = url.match(/\/d\/([a-zA-Z0-9_-]+)/); if (m3) id = m3[1]; }
    if (!id) return url;
    return `https://drive.google.com/thumbnail?id=${id}&sz=w200-h200`;
}

function buildCategoryBlock(catName, emoji, items) {
    const block = document.createElement('div');
    block.className = 'gift-cat-block';
    block.innerHTML = `<div class="gift-cat-block-header"><input type="text" class="cat-emoji-input" value="${emoji}" maxlength="2"><input type="text" class="cat-name-input" value="${catName}" placeholder="Nome da categoria"><button class="btn btn-del btn-sm" onclick="this.closest('.gift-cat-block').remove()">🗑️ Remover</button></div><div class="gift-items-editor"><div class="items-list"></div><button class="add-item-btn" onclick="addItem(this)">+ Adicionar item</button></div>`;
    const list = block.querySelector('.items-list');
    items.forEach(({item,itemEmoji,foto}) => list.appendChild(buildItemRow(item, itemEmoji, foto||'')));
    return block;
}
function buildItemRow(name, emoji, foto) {
    const row = document.createElement('div');
    row.className = 'gift-item-row-edit';

    const previewUrl = driveUrl(foto||'');
    const previewHtml = previewUrl
        ? `<img src="${previewUrl}" class="admin-foto-preview" alt="preview" onerror="this.style.display='none'">`
        : `<div class="admin-foto-preview admin-foto-empty">sem foto</div>`;

    row.innerHTML = `
        <input type="text" class="item-emoji-input" value="${emoji||'\u2728'}" maxlength="2" title="Emoji do item">
        <input type="text" class="item-name-input" value="${name||''}" placeholder="Nome do presente">
        <div class="admin-foto-wrap">
            ${previewHtml}
            <input type="url" class="item-foto-input" value="${foto||''}" placeholder="Cole o link do Google Drive">
        </div>
        <button class="btn btn-del" onclick="this.closest('.gift-item-row-edit').remove()">\ud83d\uddd1\ufe0f</button>
    `;

    // Atualiza preview ao colar/digitar nova URL
    const fotoInput = row.querySelector('.item-foto-input');
    const preview = row.querySelector('.admin-foto-preview');
    fotoInput.addEventListener('input', () => {
        const converted = driveUrl(fotoInput.value.trim());
        if (converted && preview.tagName === 'IMG') {
            preview.src = converted;
            preview.style.display = '';
        } else if (converted) {
            const img = document.createElement('img');
            img.src = converted;
            img.className = 'admin-foto-preview';
            img.alt = 'preview';
            img.onerror = () => img.style.display = 'none';
            preview.replaceWith(img);
        }
    });

    return row;
}
function addItem(btn) { const list = btn.previousElementSibling; const row = buildItemRow('','✨'); list.appendChild(row); row.querySelector('.item-name-input').focus(); }
function addCategory() { const editor = document.getElementById('gift-editor'); const block = buildCategoryBlock('Nova Categoria','🎁',[{item:'',itemEmoji:'✨'}]); editor.appendChild(block); block.querySelector('.cat-name-input').focus(); block.scrollIntoView({ behavior:'smooth', block:'center' }); }

async function saveGifts() {
    const blocks = document.querySelectorAll('.gift-cat-block');
    const newData = [];
    blocks.forEach(block => {
        const catEmoji = block.querySelector('.cat-emoji-input').value.trim()||'🎁';
        const catName = block.querySelector('.cat-name-input').value.trim();
        if (!catName) return;
        block.querySelectorAll('.gift-item-row-edit').forEach(row => {
            const ie = row.querySelector('.item-emoji-input').value.trim()||'✨';
            const in_ = row.querySelector('.item-name-input').value.trim();
            const foto = row.querySelector('.item-foto-input')?.value.trim()||'';
            if (in_) newData.push({ categoria:catName, emoji:catEmoji, item:in_, itemEmoji:ie, foto:foto, reservado:false });
        });
    });
    showSaveStatus('presentes','loading');
    try {
        const params = new URLSearchParams({ acao:'salvarPresentes', senhaAdmin:currentPassword, dados:JSON.stringify(newData) });
        const res = await fetch(SCRIPT_URL,{ method:'POST', body:params, headers:{'Content-Type':'application/x-www-form-urlencoded'} });
        const r = await res.json();
        if (r.success) { giftsData=newData; showSaveStatus('presentes','success','✅ Lista salva!'); }
        else throw new Error(r.message||'Erro');
    } catch(e) { showSaveStatus('presentes','error','❌ '+e.message); }
}

async function loadConfirmacoes() {
    const list = document.getElementById('confirmacoes-list');
    list.innerHTML = '<p class="info-text">⏳ Carregando...</p>';
    try {
        const res = await fetch(`${SCRIPT_URL}?acao=getConfirmacoes`);
        const data = await res.json();
        if (!Array.isArray(data)||data.length===0) { list.innerHTML='<p class="info-text">Nenhuma confirmação ainda.</p>'; return; }
        const total = data.reduce((s,c)=>s+(parseInt(c.pessoas)||0),0);
        list.innerHTML = `<div class="conf-table-wrap"><table class="conf-table"><thead><tr><th>#</th><th>Nome</th><th>Pessoas</th><th>Presentes</th><th>Data/Hora</th></tr></thead><tbody>${data.map((c,i)=>`<tr><td>${i+1}</td><td><strong>${c.nome||'-'}</strong></td><td>${c.pessoas||'-'}</td><td style="font-size:.8rem;max-width:200px">${c.presentes||'Nenhum'}</td><td style="font-size:.78rem;white-space:nowrap">${c.data||'-'}</td></tr>`).join('')}</tbody></table></div><p class="conf-total">Total: <strong>${data.length} confirmações</strong> · <strong>${total} pessoas</strong></p>`;
    } catch(e) { list.innerHTML=`<p class="info-text" style="color:red">❌ ${e.message}</p>`; }
}

function showSaveStatus(tab, type, msg) {
    const el = document.getElementById('save-status-'+tab);
    if (!el) return;
    el.className = 'save-status';
    if (type==='loading') { el.textContent='⏳ Salvando...'; return; }
    el.classList.add(type); el.textContent = msg||'';
    setTimeout(()=>{ el.textContent=''; el.className='save-status'; },4000);
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click',()=>{
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c=>{ c.classList.remove('active'); c.classList.add('hidden'); });
        const c = document.getElementById('tab-'+tab);
        if (c) { c.classList.remove('hidden'); c.classList.add('active'); }
    });
});
document.getElementById('login-password')?.addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });

window.doLogin=doLogin; window.doLogout=doLogout; window.saveConfig=saveConfig; window.saveSenha=saveSenha; window.saveGifts=saveGifts; window.addCategory=addCategory; window.addItem=addItem; window.loadConfirmacoes=loadConfirmacoes; window.selectPalette=selectPalette; window.selectFont=selectFont; window.previewHeroFoto=previewHeroFoto;
