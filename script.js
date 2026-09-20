const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGC-yXZRS16A1mfQo1EfgBrT31XCE4B0aDPLQToV5qoWXBgT-SqeBuVOrjOPDUolkqaA/exec";

// ============================================
// VARIÁVEIS CSS (Temas)
// ============================================
const PALETTES = {
    dourado:   { vars: { '--accent':'#d4af37','--accent-dark':'#b8941e','--accent-light':'#f5d76e','--bg-1':'#0a1128','--bg-2':'#050a18','--card-border':'rgba(212,175,55,0.2)','--card-border-h':'rgba(212,175,55,0.45)' } },
    rose:      { vars: { '--accent':'#c9847a','--accent-dark':'#a86259','--accent-light':'#f0b8b2','--bg-1':'#1a0c10','--bg-2':'#0d0608','--card-border':'rgba(201,132,122,0.22)','--card-border-h':'rgba(201,132,122,0.45)' } },
    esmeralda: { vars: { '--accent':'#5fa882','--accent-dark':'#438262','--accent-light':'#84c4a4','--bg-1':'#081a10','--bg-2':'#040d08','--card-border':'rgba(95,168,130,0.2)','--card-border-h':'rgba(95,168,130,0.4)' } },
    vinho:     { vars: { '--accent':'#c4954a','--accent-dark':'#9e7534','--accent-light':'#e0b777','--bg-1':'#1a0508','--bg-2':'#0f0305','--card-border':'rgba(196,149,74,0.22)','--card-border-h':'rgba(196,149,74,0.45)' } },
    safira:    { vars: { '--accent':'#8baed4','--accent-dark':'#6b8eb0','--accent-light':'#b5cce6','--bg-1':'#080a1a','--bg-2':'#04050d','--card-border':'rgba(139,174,212,0.2)','--card-border-h':'rgba(139,174,212,0.4)' } },
    bronze:    { vars: { '--accent':'#c89060','--accent-dark':'#9e6b41','--accent-light':'#e6b891','--bg-1':'#1a120a','--bg-2':'#0d0905','--card-border':'rgba(200,144,96,0.2)','--card-border-h':'rgba(200,144,96,0.4)' } }
};

const FONTS = {
    'Playfair Display': `'Playfair Display', serif`,
    'Great Vibes': `'Great Vibes', cursive`,
    'Cormorant Garamond': `'Cormorant Garamond', serif`,
    'Lora': `'Lora', serif`,
    'Josefin Sans': `'Josefin Sans', sans-serif`,
    'Dancing Script': `'Dancing Script', cursive`,
    'Montserrat': `'Montserrat', sans-serif`
};

let currentConfig = {};
const selectedGifts = new Set();
let pendingConf = null;

// ============================================
// INIT & API FETCH — com cache localStorage
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Mostra a página imediatamente — não trava mais esperando a API responder.
    // Isso evita a tela em branco em visitantes de primeira vez (sem cache local).
    document.body.style.opacity = '1';

    // Exibe cache imediatamente (elimina flash de layout antigo)
    const cached = localStorage.getItem('casamento_config');
    if (cached) {
        try {
            const cachedCfg = JSON.parse(cached);
            applyConfig(cachedCfg);
        } catch(e) { /* ignore */ }
    }

    // Timeout de segurança: o Apps Script pode demorar muito (cold start).
    // Se passar do limite, cancela e cai no catch em vez de travar pra sempre.
    const fetchComTimeout = (url, ms = 8000) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    };

    try {
        const [cfgRes, giftsRes] = await Promise.all([
            fetchComTimeout(`${SCRIPT_URL}?acao=getConfig`),
            fetchComTimeout(`${SCRIPT_URL}?acao=getPresentes`)
        ]);
        currentConfig = await cfgRes.json();
        const giftsData = await giftsRes.json();

        // Salva no cache para próxima visita
        localStorage.setItem('casamento_config', JSON.stringify(currentConfig));

        applyConfig(currentConfig);
        renderGifts(giftsData);
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
        document.getElementById('gift-list-container').innerHTML = '<div class="loading">❌ Não foi possível carregar a lista de presentes agora. Tente recarregar a página em alguns segundos.</div>';
    }
});

// ============================================
// APPLY CONFIG
// ============================================
function applyConfig(c) {
    applyAppearance(c);

    // Campos de texto dinâmicos
    ['nomes','assinaturaRodape','chavePix','nomeTitularPix'].forEach(id => {
        const el = document.getElementById(id);
        if (el && c[id]) {
            if (id === 'nomes') el.innerHTML = c[id].replace(/ & /g, ' <span class="ampersand">&</span> ');
            else el.textContent = c[id];
        }
    });

    // Revelar elementos após preencher (remove cfg-hidden)
    document.querySelectorAll('.cfg-hidden').forEach(el => {
        el.classList.add('cfg-loaded');
    });

    // Revelar o corpo da página inteira
    document.body.style.opacity = '1';

    // Atualizar meta OG
    const title = c.nomes ? `${c.nomes} — Casamento` : document.title;
    document.title = title;
    const ogTitle = document.getElementById('og-title');
    if (ogTitle) ogTitle.content = title;
    const ogDesc = document.getElementById('og-description');
    if (ogDesc) ogDesc.content = 'Você é parte especial desse dia. Confirme sua presença!';

    // Foto do Hero — aplica background-image dinamicamente
    if (c.heroFoto) {
        const heroEl = document.querySelector('.hero-photo');
        if (heroEl) {
            const heroUrl = typeof driveUrl === 'function' ? driveUrl(c.heroFoto, true) : c.heroFoto;
            heroEl.style.backgroundImage = `url('${heroUrl}')`;
        }
    }
}

function applyAppearance(c) {
    const styleEl = document.getElementById('aparencia-style');
    let css = ':root {\n';
    const pal = PALETTES[c.paleta] || PALETTES['dourado'];
    for (const [k, v] of Object.entries(pal.vars)) { css += `${k}: ${v};\n`; }
    const ft = FONTS[c.fonteTitulo] || FONTS['Playfair Display'];
    css += `--font-title: ${ft};\n`;
    const fb = FONTS[c.fonteCorpo] || FONTS['Montserrat'];
    css += `--font-body: ${fb};\n`;
    css += '}';
    styleEl.textContent = css;
}

// ============================================
// COPIAR PIX
// ============================================
function copiarPix() {
    const chave = document.getElementById('chavePix')?.textContent?.trim();
    const btn = document.getElementById('pix-copy-btn');
    if (!chave || !btn) return;

    navigator.clipboard.writeText(chave).then(() => {
        btn.textContent = '✅ Copiado!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = '📋 Copiar';
            btn.classList.remove('copied');
        }, 2500);
    }).catch(() => {
        // Fallback para navegadores sem clipboard API
        const el = document.createElement('textarea');
        el.value = chave;
        el.style.position = 'fixed'; el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        btn.textContent = '✅ Copiado!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = '📋 Copiar'; btn.classList.remove('copied'); }, 2500);
    });
}

// ============================================
// PRESENTES — renderização com foto e status
// ============================================

/**
 * Converte qualquer link do Google Drive em URL direta para <img>.
 */
function driveUrl(url, highQuality = false) {
    if (!url || url.trim() === '') return '';

    // Extrair o FILE ID de qualquer formato de URL do Drive
    let id = null;

    // Formato /file/d/ID/...
    const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) id = m1[1];

    // Formato ?id=ID ou &id=ID
    if (!id) {
        const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (m2) id = m2[1];
    }

    // Formato lh3.googleusercontent.com/d/ID
    if (!id) {
        const m3 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (m3) id = m3[1];
    }

    if (!id) return url; // URL não é do Drive, retorna sem alterar

    // Usa a API de thumbnail do Google
    // Se highQuality for true, traz em HD (lado maior com 2000px). Senão, miniatura para os cards.
    if (highQuality) {
        return `https://drive.google.com/thumbnail?id=${id}&sz=s2000`;
    }
    return `https://drive.google.com/thumbnail?id=${id}&sz=w400-h400`;
}

function renderGifts(data) {
    const container = document.getElementById('gift-list-container');
    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<div class="gift-empty">Nenhum presente disponível no momento.</div>';
        return;
    }

    const catMap = {};
    data.forEach(it => {
        if (!catMap[it.categoria]) catMap[it.categoria] = { emoji: it.emoji, items: [] };
        catMap[it.categoria].items.push(it);
    });

    container.innerHTML = '';
    const section = document.createElement('div');
    section.className = 'gift-list-section';

    for (const [cat, info] of Object.entries(catMap)) {
        const catCard = document.createElement('div');
        catCard.className = 'gift-cat-card';

        catCard.innerHTML = `
            <div class="gift-cat-header">
                <div class="cat-emoji-wrap">${info.emoji}</div>
                <div class="cat-name-text">${cat}</div>
            </div>
        `;

        const grid = document.createElement('div');
        grid.className = 'gift-items-grid';

        info.items.forEach(it => {
            const cell = document.createElement('div');
            const isReservado = it.reservado === true;

            // Converte URL do Drive para URL direta de imagem
            const fotoUrl = driveUrl(it.foto);
            const hasFoto = fotoUrl !== '';

            cell.className = `gift-item-cell ${isReservado ? 'reservado' : ''} ${hasFoto ? 'has-photo' : ''}`;
            
            const contentHtml = hasFoto 
                ? `
                   <img src="${fotoUrl}" class="item-photo" alt="${it.item}" loading="lazy">
                   <div class="item-label">${it.item}</div>
                  `
                : `
                   <div class="item-icon">${it.itemEmoji || '✨'}</div>
                   <div class="item-label">${it.item}</div>
                  `;

            cell.innerHTML = `
                ${contentHtml}
                <div class="item-check"></div>
            `;

            if (!isReservado) {
                cell.onclick = () => toggleGift(cell, it.item);
            }
            grid.appendChild(cell);
        });

        catCard.appendChild(grid);
        section.appendChild(catCard);
    }

    // Adiciona "assinatura" no final da lista
    const sig = document.createElement('div');
    sig.className = 'gift-signature';
    sig.innerHTML = `
        <div class="sig-line"></div>
        <div class="sig-heart">💛</div>
        <div class="sig-text">Muito obrigado!</div>
    `;
    section.appendChild(sig);

    container.appendChild(section);
}

function toggleGift(cell, itemName) {
    if (selectedGifts.has(itemName)) {
        selectedGifts.delete(itemName);
        cell.classList.remove('selected');
    } else {
        selectedGifts.add(itemName);
        cell.classList.add('selected');
    }
}

// ============================================
// MODAIS E CONFIRMAÇÃO
// ============================================
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.body.style.overflow = '';
}
function closeModalOutside(e, id) {
    if (e.target.id === id) closeModal(id);
}

function iniciarConfirmacao() {
    const nome = document.getElementById('nome').value.trim();
    const pessoas = document.getElementById('pessoas').value;

    document.getElementById('nome-error').textContent = '';
    document.getElementById('pessoas-error').textContent = '';

    let error = false;
    if (!nome) { document.getElementById('nome-error').textContent = '⚠️ Informe seu nome.'; error = true; }
    if (!pessoas || pessoas < 1) { document.getElementById('pessoas-error').textContent = '⚠️ Informe o número de pessoas.'; error = true; }
    if (error) return;

    pendingConf = { nome, pessoas, gifts: Array.from(selectedGifts) };

    if (pendingConf.gifts.length === 0) {
        openModal('modal-lembrete');
    } else {
        mostrarModalConfirmacao();
    }
}

function irParaPresentes() {
    closeModal('modal-lembrete');
    document.getElementById('gift-list-container').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function prosseguirSemPresentes() {
    closeModal('modal-lembrete');
    mostrarModalConfirmacao();
}

function mostrarModalConfirmacao() {
    const giftsHtml = pendingConf.gifts.length > 0 
        ? `<ul>${pendingConf.gifts.map(g => `<li>🎁 ${g}</li>`).join('')}</ul>`
        : `<p style="color:#666; font-style:italic; margin-top:10px;">Nenhum presente marcado.</p>`;

    document.getElementById('modal-confirm-body').innerHTML = `
        <p>Você está confirmando presença para <strong>${pendingConf.pessoas} pessoa(s)</strong> no nome de <strong>${pendingConf.nome}</strong>.</p>
        <p style="margin-top:16px; font-weight:600; color:var(--green-dark);">Presentes selecionados:</p>
        ${giftsHtml}
    `;
    document.getElementById('modal-error').textContent = '';
    openModal('modal-confirm');
}

async function doConfirmacao() {
    const btn = document.getElementById('modal-ok-btn');
    const err = document.getElementById('modal-error');
    btn.innerHTML = '⏳ Confirmando...';
    btn.disabled = true;
    err.textContent = '';

    try {
        const giftText = pendingConf.gifts.length > 0 ? pendingConf.gifts.join(', ') : 'Nenhum';
        const params = new URLSearchParams({ acao: 'confirmar', nome: pendingConf.nome, pessoas: pendingConf.pessoas, presentes: giftText });

        const res = await fetch(SCRIPT_URL, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const result = await res.json();

        if (result.success) {
            closeModal('modal-confirm');
            document.getElementById('nome').value = '';
            document.getElementById('pessoas').value = '';
            selectedGifts.clear();

            document.getElementById('modal-success-body').innerHTML = `
                <p style="font-size:1.1rem; font-family:var(--font-title); color:var(--green-dark);">Obrigado, ${pendingConf.nome}!</p>
                <p style="margin-top:12px;">Sua presença foi confirmada e estamos muito felizes por celebrar esse dia com você. 💛</p>
            `;
            document.getElementById('modal-success').classList.remove('hidden');
            shootConfetti();

            // Marcar itens confirmados como reservados no DOM IMEDIATAMENTE
            // (sem esperar o Apps Script — garante o visual mesmo antes de redeployar)
            const confirmedItems = pendingConf.gifts;
            if (confirmedItems.length > 0) {
                document.querySelectorAll('.gift-item-cell:not(.reservado)').forEach(cell => {
                    const label = cell.querySelector('.item-label')?.textContent?.trim();
                    if (confirmedItems.includes(label)) {
                        cell.classList.remove('selected');
                        cell.classList.add('reservado');
                        cell.onclick = null;
                    }
                });
            }

            // Recarregar presentes da API em background
            fetch(`${SCRIPT_URL}?acao=getPresentes`)
                .then(r => r.json())
                .then(d => renderGifts(d))
                .catch(() => {}); // se falhar, o DOM já foi atualizado

        } else { throw new Error(result.message); }
    } catch (e) {
        err.textContent = '❌ Erro: ' + e.message;
    } finally {
        btn.innerHTML = '💍 Confirmar'; btn.disabled = false;
    }
}

function shootConfetti() {
    const container = document.getElementById('modal-confetti-container');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#d4af37', '#b8941e', '#f5d76e', '#5fa882', '#fff'];
    for (let i = 0; i < 50; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti-piece';
        conf.style.left = Math.random() * 100 + '%';
        conf.style.top = '-20px';
        conf.style.background = colors[Math.floor(Math.random() * colors.length)];
        conf.style.animation = `fall ${Math.random() * 2 + 1.5}s linear forwards`;
        conf.style.transform = `rotate(${Math.random() * 360}deg)`;
        container.appendChild(conf);
    }
    const style = document.createElement('style');
    style.innerHTML = `@keyframes fall { to { transform: translateY(300px) rotate(720deg); opacity: 1; } }`;
    container.appendChild(style);
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.style.opacity = 1; entry.target.style.transform = 'translateY(0)'; } });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
