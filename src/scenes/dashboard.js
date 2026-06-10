import {
    getSzene, setSzene,
    getCharaktere, setCharaktere,
    getLetzteEreignisse,
    getQuests, setQuests,
    getAusruestung, setAusruestung,
    istGesperrt, sperreFeld, entsperreFeld,
} from '../core/state.js';

let _context = null;

function el(id) {
    return document.getElementById(id);
}

function lockIcon(feld) {
    return istGesperrt(feld) ? '🔒' : '🔓';
}

function lockToggle(feld) {
    if (istGesperrt(feld)) {
        entsperreFeld(feld);
    } else {
        sperreFeld(feld);
    }
}

function lockButton(feld, label) {
    return `<button class="lb-lock" data-field="${feld}" title="${label} ${istGesperrt(feld) ? 'entsperren' : 'sperren'}">${lockIcon(feld)}</button>`;
}

function editable(value, feld) {
    if (istGesperrt(feld)) {
        return `<span class="lb-val">${esc(value)}</span>`;
    }
    return `<span class="lb-val" contenteditable="true" data-field="${feld}">${esc(value)}</span>`;
}

function esc(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderHUD() {
    const container = el('lb-hud');
    if (!container) return;

    const szene = getSzene();

    container.innerHTML = `
        <div class="lb-hud-row">
            <span class="lb-field-label">Ort</span>
            ${editable(szene.ort, 'szenenfenster.ort')}
            ${lockButton('szenenfenster.ort', 'Ort')}
        </div>
        <div class="lb-hud-row">
            <span class="lb-field-label">Zeit</span>
            ${editable(szene.zeit, 'szenenfenster.zeit')}
            ${lockButton('szenenfenster.zeit', 'Zeit')}
        </div>
        <div class="lb-hud-row">
            <span class="lb-field-label">Wetter</span>
            ${editable(szene.wetter, 'szenenfenster.wetter')}
            ${lockButton('szenenfenster.wetter', 'Wetter')}
        </div>
    `;
}

function renderChars() {
    const container = el('lb-chars');
    if (!container) return;

    const chars = getCharaktere();

    let html = '';
    for (const c of chars) {
        html += `
            <div class="lb-char-card">
                <div class="lb-char-name">
                    ${editable(c.name, `char.${c.name}.name`)}
                    ${lockButton(`char.${c.name}.name`, 'Name')}
                </div>
                <div class="lb-char-row">
                    <span class="lb-field-label">Status</span>
                    ${editable(c.status, `char.${c.name}.status`)}
                    ${lockButton(`char.${c.name}.status`, 'Status')}
                </div>
                <div class="lb-char-row">
                    <span class="lb-field-label">Beziehung</span>
                    ${editable(c.beziehung, `char.${c.name}.beziehung`)}
                    ${lockButton(`char.${c.name}.beziehung`, 'Beziehung')}
                </div>
                <div class="lb-char-row">
                    <span class="lb-field-label">Gedanken</span>
                    ${editable(c.gedanken, `char.${c.name}.gedanken`)}
                    ${lockButton(`char.${c.name}.gedanken`, 'Gedanken')}
                </div>
                <button class="lb-btn-sm lb-char-remove" data-char="${esc(c.name)}">✕</button>
            </div>
        `;
    }

    if (chars.length === 0) {
        html = '<div class="lb-empty">Keine Charaktere</div>';
    }

    html += `<button class="lb-btn lb-add-char">+ Charakter</button>`;
    container.innerHTML = html;
}

function renderEquip() {
    const container = el('lb-equip');
    if (!container) return;

    const equip = getAusruestung();
    const chars = getCharaktere();

    let html = '';
    for (const c of chars) {
        const items = equip[c.name] || [];
        html += `<div class="lb-equip-group">
            <span class="lb-equip-char">${esc(c.name)}</span>
            <div class="lb-equip-items">`;

        for (let i = 0; i < items.length; i++) {
            html += `
                <div class="lb-equip-item">
                    ${editable(items[i], `equip.${c.name}.${i}`)}
                    <button class="lb-btn-sm lb-equip-remove" data-char="${esc(c.name)}" data-idx="${i}">✕</button>
                </div>
            `;
        }

        if (items.length === 0) {
            html += '<div class="lb-empty">Keine Ausrüstung</div>';
        }

        html += `</div>
            <button class="lb-btn-sm lb-add-item" data-char="${esc(c.name)}">+ Gegenstand</button>
        </div>`;
    }

    if (chars.length === 0) {
        html = '<div class="lb-empty">Keine Charaktere für Ausrüstung</div>';
    }

    container.innerHTML = html;
}

function renderQuests() {
    const container = el('lb-quests');
    if (!container) return;

    const quests = getQuests();

    let html = '';
    for (let i = 0; i < quests.length; i++) {
        const q = quests[i];
        html += `
            <div class="lb-quest-row ${q.abgeschlossen ? 'lb-quest-done' : ''}">
                <input type="checkbox" class="lb-quest-check" data-idx="${i}" ${q.abgeschlossen ? 'checked' : ''}>
                ${editable(q.titel, `quest.${i}`)}
                <button class="lb-btn-sm lb-quest-remove" data-idx="${i}">✕</button>
            </div>
        `;
    }

    if (quests.length === 0) {
        html = '<div class="lb-empty">Keine Quests</div>';
    }

    html += `<button class="lb-btn lb-add-quest">+ Quest</button>`;
    container.innerHTML = html;
}

function renderEvents() {
    const container = el('lb-events');
    if (!container) return;

    const events = getLetzteEreignisse();
    const anzuzeigen = events.slice(0, 10);

    let html = '';
    for (const e of anzuzeigen) {
        const zeit = e.zeitstempel ? new Date(e.zeitstempel).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
        html += `
            <div class="lb-event">
                <span class="lb-event-time">${zeit}</span>
                <span class="lb-event-title ${e.kategorie ? 'lb-cat-' + e.kategorie : ''}">${esc(e.titel)}</span>
            </div>
        `;
    }

    if (anzuzeigen.length === 0) {
        html = '<div class="lb-empty">Keine Ereignisse</div>';
    }

    container.innerHTML = html;
}

function renderAll() {
    renderHUD();
    renderChars();
    renderEquip();
    renderQuests();
    renderEvents();
}

function bindEditable(root) {
    root.querySelectorAll('[contenteditable="true"]').forEach(el => {
        el.addEventListener('blur', () => {
            const feld = el.dataset.field;
            const value = el.textContent.trim();
            if (!feld) return;
            handleEditSave(feld, value);
        });
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                el.blur();
            }
        });
    });
}

function handleEditSave(feld, value) {
    if (!feld || istGesperrt(feld)) return;

    if (feld.startsWith('szenenfenster.')) {
        const key = feld.split('.')[1];
        setSzene({ [key]: value });
    } else if (feld.startsWith('char.')) {
        const parts = feld.split('.');
        const charName = parts[1];
        const attr = parts[2];
        const chars = getCharaktere();
        const found = chars.find(c => c.name === charName);
        if (found) {
            found[attr] = value;
            setCharaktere(chars);
        }
    } else if (feld.startsWith('equip.')) {
        const parts = feld.split('.');
        const charName = parts[1];
        const idx = parseInt(parts[2], 10);
        const equip = getAusruestung();
        if (equip[charName] && equip[charName][idx] !== undefined) {
            equip[charName][idx] = value;
            setAusruestung(charName, equip[charName]);
        }
    } else if (feld.startsWith('quest.')) {
        const idx = parseInt(feld.split('.')[1], 10);
        const quests = getQuests();
        if (quests[idx]) {
            quests[idx].titel = value;
            setQuests(quests);
        }
    }

    renderAll();
    bindEvents();
}

function bindLocks(root) {
    root.querySelectorAll('.lb-lock').forEach(btn => {
        btn.addEventListener('click', () => {
            const feld = btn.dataset.field;
            if (!feld) return;
            lockToggle(feld);
            renderAll();
            bindEvents();
        });
    });
}

function bindButtons(root) {
    root.querySelectorAll('.lb-add-char').forEach(btn => {
        btn.addEventListener('click', () => {
            const name = prompt('Charakter-Name:');
            if (!name || !name.trim()) return;
            const chars = getCharaktere();
            chars.push({ name: name.trim(), status: '', beziehung: '', gedanken: '' });
            setCharaktere(chars);
            renderAll();
            bindEvents();
        });
    });

    root.querySelectorAll('.lb-char-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.dataset.char;
            if (!name) return;
            setCharaktere(getCharaktere().filter(c => c.name !== name));
            renderAll();
            bindEvents();
        });
    });

    root.querySelectorAll('.lb-add-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const charName = btn.dataset.char;
            const item = prompt(`Gegenstand für ${charName}:`);
            if (!item || !item.trim()) return;
            const equip = getAusruestung();
            if (!equip[charName]) equip[charName] = [];
            equip[charName].push(item.trim());
            setAusruestung(charName, equip[charName]);
            renderAll();
            bindEvents();
        });
    });

    root.querySelectorAll('.lb-equip-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const charName = btn.dataset.char;
            const idx = parseInt(btn.dataset.idx, 10);
            const equip = getAusruestung();
            if (equip[charName]) {
                equip[charName].splice(idx, 1);
                setAusruestung(charName, equip[charName]);
                renderAll();
                bindEvents();
            }
        });
    });

    root.querySelectorAll('.lb-add-quest').forEach(btn => {
        btn.addEventListener('click', () => {
            const titel = prompt('Quest-Beschreibung:');
            if (!titel || !titel.trim()) return;
            const quests = getQuests();
            quests.push({ titel: titel.trim(), abgeschlossen: false });
            setQuests(quests);
            renderAll();
            bindEvents();
        });
    });

    root.querySelectorAll('.lb-quest-check').forEach(cb => {
        cb.addEventListener('change', () => {
            const idx = parseInt(cb.dataset.idx, 10);
            const quests = getQuests();
            if (quests[idx]) {
                quests[idx].abgeschlossen = cb.checked;
                setQuests(quests);
                renderAll();
                bindEvents();
            }
        });
    });

    root.querySelectorAll('.lb-quest-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx, 10);
            const quests = getQuests();
            quests.splice(idx, 1);
            setQuests(quests);
            renderAll();
            bindEvents();
        });
    });
}

export function bindEvents() {
    const root = el('lorebook-brain-panel');
    if (!root) return;
    bindEditable(root);
    bindLocks(root);
    bindButtons(root);
}

export async function initDashboard(context) {
    _context = context;

    const template = await context.renderExtensionTemplateAsync('lorebook_brain', 'template');
    document.body.insertAdjacentHTML('beforeend', template);

    renderAll();
    bindEvents();

    const toggle = el('lorebook-brain-panel')?.querySelector('.lb-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const panel = el('lorebook-brain-panel');
            panel.classList.toggle('lb-collapsed');
            toggle.textContent = panel.classList.contains('lb-collapsed') ? '▼' : '▲';
        });
    }

    const refreshBtn = el('lb-refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            renderAll();
            bindEvents();
        });
    }

    const position = _context.extensionSettings?.lorebook_brain?.szenenfenster?.panelPosition;
    setzePanelPosition(position || 'rechts');
}

export function setzePanelPosition(pos) {
    const panel = el('lorebook-brain-panel');
    if (!panel) return;
    panel.classList.remove('lb-left', 'lb-right');
    panel.classList.add(`lb-${pos}`);
}

export function aktualisiereDashboard() {
    renderAll();
    bindEvents();
}
