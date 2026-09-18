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
    initCanvas();
    startCountdown(); // inicia com data default; atualiza após config

    // Exibe cache imediatamente (elimina flash de layout antigo)
    const cached = localStorage.getItem('casamento_config');
    if (cached) {
        try {
            const cachedCfg = JSON.parse(cached);
            applyConfig(cachedCfg);
        } catch(e) { /* ignore */ }
    }

    try {
        const [cfgRes, giftsRes] = await Promise.all([
            fetch(`${SCRIPT_URL}?acao=getConfig`),
            fetch(`${SCRIPT_URL}?acao=getPresentes`)
        ]);
        currentConfig = await cfgRes.json();
        const giftsData = await giftsRes.json();

        // Salva no cache para próxima visita
        localStorage.setItem('casamento_config', JSON.stringify(currentConfig));

        applyConfig(currentConfig);
        renderGifts(giftsData);
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
        document.getElementById('gift-list-container').innerHTML = '<div class="loading">❌ Erro ao carregar presentes. Tente recarregar a página.</div>';
    }
});

// ============================================
// APPLY CONFIG
// ============================================
function applyConfig(c) {
    applyAppearance(c);
    applyMonogram(c);

    // Campos de texto dinâmicos
    ['nomes','fraseAbertura','assinaturaRodape','data','hora','localCerimonia','endereco','nossaHistoria','chavePix','nomeTitularPix'].forEach(id => {
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
    const title = c.nomes ? `${c.nomes} — Casamento ${c.data || ''}`.trim() : document.title;
    document.title = title;
    const ogTitle = document.getElementById('og-title');
    if (ogTitle) ogTitle.content = title;
    const ogDesc = document.getElementById('og-description');
    if (ogDesc && c.fraseAbertura) ogDesc.content = c.fraseAbertura + ' Confirme sua presença!';

    // Mapa
    if (c.embedMapa) {
        const m = document.getElementById('mapEmbed');
        if (m) m.src = c.embedMapa;
    }
    if (c.linkMapa) {
        const ml = document.getElementById('mapLink');
        if (ml) ml.href = c.linkMapa;
    }

    // Countdown — atualiza data alvo e REINICIA o contador
    if (c.data) {
        updateCountdownTarget(c.data);
        startCountdown(); // sempre reinicia para pegar a data nova
    }

    // Prova social
    applyProvaSocial(c);
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

    const rgb = hexToRgb(pal.vars['--accent']);
    if (rgb && window.setParticleColor) window.setParticleColor(rgb.r, rgb.g, rgb.b);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function applyMonogram(c) {
    const wrap = document.getElementById('monogram-wrap');
    const rings = document.getElementById('hero-rings');
    if (!wrap || !rings) return;

    if (c.mostrarMonograma === 'true' || c.mostrarMonograma === true) {
        rings.classList.add('hidden');
        wrap.classList.remove('hidden');

        if (c.monogramaEstilo === 'image' && c.monogramaImagem) {
            const monoUrl = typeof driveUrl === 'function' ? driveUrl(c.monogramaImagem) : c.monogramaImagem;
            wrap.innerHTML = `
                <div id="monogram-frame" class="monogram-image ${c.monogramaImagem.includes('round')||c.monogramaImagem.includes('circ')?'monogram-circle':'monogram-bare'}">
                    <img src="${monoUrl}" alt="Monograma">
                </div>
            `;
        } else {
            const cls = (c.monogramaEstilo === 'diamond') ? 'monogram-diamond' : (c.monogramaEstilo === 'bare') ? 'monogram-bare' : 'monogram-circle';
            wrap.innerHTML = `
                <div id="monogram-frame" class="monogram-frame ${cls}">
                    <span id="monogram-initials" class="monogram-initials">${c.monograma || 'F & W'}</span>
                </div>
            `;
            if (c.monogramaEstilo === 'diamond') {
                const s = document.getElementById('monogram-initials');
                if (s) s.style.transform = 'rotate(-45deg)';
            }
        }
    } else {
        wrap.classList.add('hidden');
        rings.classList.remove('hidden');
    }
}

// ============================================
// PROVA SOCIAL
// ============================================
function applyProvaSocial(c) {
    const badge = document.getElementById('prova-social-badge');
    const text = document.getElementById('prova-social-text');
    if (!badge || !text) return;

    if (c.mostrarProvaSocial === 'true') {
        const total = parseInt(c.totalConfirmados) || 0;
        const pessoas = parseInt(c.totalPessoas) || 0;
        if (total > 0) {
            text.textContent = `🎉 ${total} família${total > 1 ? 's' : ''} confirmada${total > 1 ? 's' : ''} · ${pessoas} pessoa${pessoas > 1 ? 's' : ''}!`;
        } else {
            text.textContent = '💍 Seja o primeiro a confirmar!';
        }
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// ============================================
// COUNTDOWN
// ============================================
const MESES_PT = {
    'janeiro':1,'fevereiro':2,'março':3,'abril':4,'maio':5,'junho':6,
    'julho':7,'agosto':8,'setembro':9,'outubro':10,'novembro':11,'dezembro':12
};
let countdownTarget = new Date('2026-07-25T16:00:00');
let countdownInterval = null;

function updateCountdownTarget(dataStr) {
    // Tenta parsear "25 de Julho de 2026"
    const match = dataStr.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d+)/i);
    if (match) {
        const dia = parseInt(match[1]);
        const mes = MESES_PT[match[2].toLowerCase()];
        const ano = parseInt(match[3]);
        if (dia && mes && ano) {
            countdownTarget = new Date(ano, mes - 1, dia, 16, 0, 0);
        }
    }
}

function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    tickCountdown();
    countdownInterval = setInterval(tickCountdown, 1000);
}

function tickCountdown() {
    const now = new Date();
    const diff = countdownTarget - now;

    const wrap = document.getElementById('countdown-wrap');
    if (!wrap) return;

    if (diff <= 0) {
        // Não cancela de vez — apenas mostra a mensagem e aguarda
        // o config atualizar com uma data futura
        if (!wrap.querySelector('.countdown-done')) {
            wrap.innerHTML = '<p class="countdown-done" style="color:var(--accent);font-family:var(--font-title);font-size:1.2rem;text-align:center;padding:12px">🎉 É hoje! Até logo!</p>';
        }
        return;
    }

    // Se tiver a mensagem de "É hoje!" mas a diff for > 0, reconstruímos os blocos:
    if (wrap.querySelector('.countdown-done')) {
        wrap.innerHTML = `
            <div class="cd-box"><div class="cd-number" id="cd-days">--</div><div class="cd-label">Dias</div></div>
            <div class="cd-box"><div class="cd-number" id="cd-hours">--</div><div class="cd-label">Hrs</div></div>
            <div class="cd-box"><div class="cd-number" id="cd-mins">--</div><div class="cd-label">Min</div></div>
            <div class="cd-box"><div class="cd-number" id="cd-secs">--</div><div class="cd-label">Seg</div></div>
        `;
    }

    const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs  = Math.floor((diff % (1000 * 60)) / 1000);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val).padStart(2, '0'); };
    set('cd-days', days);
    set('cd-hours', hours);
    set('cd-mins', mins);
    set('cd-secs', secs);
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
 * Aceita todos os formatos:
 *   - https://drive.google.com/file/d/ID/view...
 *   - https://drive.google.com/open?id=ID
 *   - https://drive.google.com/uc?id=ID...
 *   - https://lh3.googleusercontent.com/d/ID
 * Retorna URL no formato de thumbnail (mais confiável).
 */
function driveUrl(url) {
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

    // Usa a API de thumbnail do Google — mais confiável que /uc?export=view
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

            // Define classes
            cell.className = 'gift-item-cell' + (hasFoto ? ' has-photo' : '') + (isReservado ? ' reservado' : '');


            const mediaHtml = hasFoto
                ? `<img src="${fotoUrl}" alt="${it.item}" class="item-photo" loading="lazy"
                       onerror="this.src='https://drive.google.com/uc?export=view&id=${fotoUrl.match(/id=([^&]+)/)?.[1]||''}';this.onerror=function(){this.style.display='none';this.nextSibling.style.display='block';}">`
                  + `<div class="item-icon" style="display:none">${it.itemEmoji || '✨'}</div>`
                : `<div class="item-icon">${it.itemEmoji || '✨'}</div>`;

            cell.innerHTML = `
                ${mediaHtml}
                <div class="item-label">${it.item}</div>
                <div class="item-check"></div>
            `;

            if (!isReservado) {
                cell.onclick = () => {
                    if (cell.classList.contains('selected')) {
                        cell.classList.remove('selected');
                        selectedGifts.delete(it.item);
                    } else {
                        cell.classList.add('selected');
                        selectedGifts.add(it.item);
                    }
                };
            }

            grid.appendChild(cell);
        });

        catCard.appendChild(grid);
        section.appendChild(catCard);
    }

    // Assinatura
    const sig = document.createElement('div');
    sig.className = 'gift-signature';
    sig.innerHTML = `<div class="sig-line"></div><div class="sig-heart">❤️</div><div class="sig-text">Muito Obrigado!</div>`;
    section.appendChild(sig);

    container.appendChild(section);
}

// ============================================
// FORMULÁRIO — validação inline + fluxo lembrete
// ============================================
function setFieldError(fieldId, msg) {
    const errEl = document.getElementById(fieldId + '-error');
    const inp = document.getElementById(fieldId);
    if (errEl) errEl.textContent = msg;
    if (inp) inp.style.borderColor = msg ? 'rgba(255,100,100,0.7)' : '';
}

function clearErrors() {
    ['nome', 'pessoas'].forEach(f => setFieldError(f, ''));
}

function iniciarConfirmacao() {
    clearErrors();
    const nome = document.getElementById('nome').value.trim();
    const pessoas = document.getElementById('pessoas').value;

    let valid = true;
    if (!nome) { setFieldError('nome', '⚠️ Informe seu nome completo.'); valid = false; }
    if (!pessoas || parseInt(pessoas) < 1) { setFieldError('pessoas', '⚠️ Informe o número de pessoas.'); valid = false; }
    if (!valid) return;

    // Se nenhum presente foi selecionado, mostrar lembrete
    if (selectedGifts.size === 0) {
        document.getElementById('modal-lembrete').classList.remove('hidden');
    } else {
        abrirModalConfirmacao();
    }
}

function irParaPresentes() {
    closeModal('modal-lembrete');
    const giftSection = document.querySelector('#gift-list-container');
    if (giftSection) giftSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function prosseguirSemPresentes() {
    closeModal('modal-lembrete');
    abrirModalConfirmacao();
}

function abrirModalConfirmacao() {
    const nome = document.getElementById('nome').value.trim();
    const pessoas = document.getElementById('pessoas').value;
    const gifts = Array.from(selectedGifts);

    let bodyHtml = `<p>Confirmando <strong>${pessoas} pessoa(s)</strong> em nome de <strong>${nome}</strong>.</p>`;

    if (gifts.length > 0) {
        bodyHtml += `<p style="margin-top:16px; margin-bottom:0;">Itens que você selecionou:</p><ul>`;
        gifts.forEach(g => bodyHtml += `<li>🎁 ${g}</li>`);
        bodyHtml += `</ul><p style="margin-top:16px; font-size:0.85rem; color:#666;">Esses itens sairão da lista para que outros não os escolham.</p>`;
    } else {
        bodyHtml += `<p style="margin-top:16px">Nenhum presente foi selecionado na lista.</p>`;
    }

    document.getElementById('modal-confirm-body').innerHTML = bodyHtml;
    document.getElementById('modal-error').textContent = '';
    pendingConf = { nome, pessoas, gifts };
    document.getElementById('modal-confirm').classList.remove('hidden');
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function closeModalOutside(e, id) { if (e.target.id === id) closeModal(id); }

async function doConfirmacao() {
    if (!pendingConf) return;
    const btn = document.getElementById('modal-ok-btn');
    const err = document.getElementById('modal-error');
    btn.innerHTML = '⏳ Salvando...'; btn.disabled = true; err.textContent = '';

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

            // Atualizar prova social no localStorage e na tela
            const updatedConfig = { ...currentConfig };
            const prev = parseInt(updatedConfig.totalConfirmados) || 0;
            const prevP = parseInt(updatedConfig.totalPessoas) || 0;
            updatedConfig.totalConfirmados = String(prev + 1);
            updatedConfig.totalPessoas = String(prevP + parseInt(pendingConf.pessoas));
            localStorage.setItem('casamento_config', JSON.stringify(updatedConfig));
            applyProvaSocial(updatedConfig);
            currentConfig = updatedConfig;
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

// ============================================
// ANIMAÇÃO DE FUNDO (PARTÍCULAS)
// ============================================
let pR = 212, pG = 175, pB = 55;
window.setParticleColor = function(r, g, b) { pR = r; pG = g; pB = b; }

function initCanvas() {
    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');
    let width, height, particles = [];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.x = Math.random() * width; this.y = Math.random() * height;
            this.size = Math.random() * 1.5 + 0.5;
            this.speedX = Math.random() * 0.5 - 0.25; this.speedY = Math.random() * -0.5 - 0.1;
            this.opacity = Math.random() * 0.5 + 0.1;
        }
        update() {
            this.x += this.speedX; this.y += this.speedY;
            if (this.y < 0) { this.y = height; this.x = Math.random() * width; }
            if (this.x > width) this.x = 0; else if (this.x < 0) this.x = width;
        }
        draw() {
            ctx.fillStyle = `rgba(${pR}, ${pG}, ${pB}, ${this.opacity})`;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
    }

    for (let i = 0; i < 80; i++) particles.push(new Particle());

    function animate() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animate);
    }
    animate();
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.style.opacity = 1; entry.target.style.transform = 'translateY(0)'; } });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
