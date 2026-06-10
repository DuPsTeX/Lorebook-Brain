const LABEL = 'lorebook_brain';

let _context = null;
let _settings = null;
let _buchName = null;
let _worldInfo = null;

function holeBookList() {
    if (!_worldInfo) return [];
    return _worldInfo.bookList || _worldInfo.worlds || [];
}

function holeBuch() {
    const buecher = holeBookList();
    return buecher.find(b => (b.name || b.data?.name) === _buchName);
}

function holeEintraege() {
    const buch = holeBuch();
    if (!buch) return [];
    return buch.entries || buch.data?.entries || [];
}

async function speichereBuch() {
    const buch = holeBuch();
    if (!buch) return;
    if (_worldInfo.saveWorld) {
        await _worldInfo.saveWorld(_buchName);
    }
}

let _entryCounter = Date.now();

function erstelleEntry(fakt) {
    const content = fakt.titel
        ? `[${fakt.titel}]\n${fakt.inhalt || ''}`
        : (fakt.inhalt || '');

    return {
        uid: ++_entryCounter,
        key: (fakt.keywords || []).join(','),
        keysecondary: '',
        content,
        comment: fakt.titel || '',
        constant: false,
        vectorized: false,
        selective: false,
        order: 100,
        position: 0,
        depth: 4,
        probability: 100,
        group: '',
        groupWeight: 100,
        disable: false,
        selectiveLogic: 0,
        [LABEL]: true,
    };
}

export function initLorebook(ctx, settings) {
    _context = ctx;
    _settings = settings;
    _worldInfo = ctx.worldInfo;

    _buchName = ctx.chatMetadata?.lorebook_brain?.lorebookDatei || null;
}

function autoNameFuerBuch() {
    const charName = _context?.characters?.[_context?.characterId]?.name || 'Charakter';
    const dateStr = new Date().toISOString().slice(0, 10);
    return `🧠 ${charName} - ${dateStr}`;
}

function merkeBuchName(name) {
    _buchName = name;

    const cm = _context?.chatMetadata;
    if (cm) {
        cm.lorebook_brain = cm.lorebook_brain || {};
        cm.lorebook_brain.lorebookDatei = name;
        if (_context?.saveChatDebounced) {
            _context.saveChatDebounced();
        }
    }

    if (_settings) {
        _settings.lorebook = _settings.lorebook || {};
        _settings.lorebook.dateiName = name;
        _settings.lorebook.anChatGebunden = true;
        if (_context?.saveSettingsDebounced) {
            _context.saveSettingsDebounced();
        }
    }

    console.log('[Lorebook Brain] Buch gemerkt:', name);
}

function findeChatLorebook() {
    const cm = _context?.chatMetadata;
    if (!cm) return null;

    for (const key of ['world', 'world_id', 'chat_world', 'lorebook', 'chat_lorebook']) {
        const name = cm[key];
        if (name && typeof name === 'string' && holeBuchByName(name)) {
            return name;
        }
    }
    return null;
}

function holeBuchByName(name) {
    const buecher = holeBookList();
    return buecher.find(b => (b.name || b.data?.name) === name) || null;
}

function findeBestehendesBrainBuch() {
    const buecher = holeBookList();
    for (const buch of buecher) {
        const entries = buch.entries || buch.data?.entries || [];
        if (entries.some(e => e.lorebook_brain)) {
            return buch.name || buch.data?.name;
        }
    }
    return null;
}

export async function stelleBuchBereit() {
    if (!_worldInfo) {
        console.error('[Lorebook Brain] worldInfo-API nicht verfügbar');
        return false;
    }

    if (_buchName && holeBuch()) {
        return true;
    }

    const gesetzterName = _buchName;

    const chatBuch = findeChatLorebook();
    if (chatBuch) {
        console.log('[Lorebook Brain] Verwende Chat-Lorebook:', chatBuch);
        merkeBuchName(chatBuch);
        return true;
    }

    const bestehendes = findeBestehendesBrainBuch();
    if (bestehendes) {
        console.log('[Lorebook Brain] Verwende bestehendes Brain-Buch:', bestehendes);
        merkeBuchName(bestehendes);
        return true;
    }

    const name = gesetzterName || autoNameFuerBuch();

    if (_worldInfo.addWorld) {
        await _worldInfo.addWorld(name);
    } else if (_worldInfo.createWorld) {
        await _worldInfo.createWorld(name);
    }

    const buch = holeBuchByName(name);
    if (!buch) {
        console.error('[Lorebook Brain] Buch konnte nicht erstellt werden:', name);
        return false;
    }

    console.log('[Lorebook Brain] Neues Buch erstellt:', name);
    merkeBuchName(name);
    return true;
}

export async function erstelleEintrag(fakt) {
    const bereit = await stelleBuchBereit();
    if (!bereit) return null;

    const buch = holeBuch();
    if (!buch) return null;

    const entries = buch.entries || (buch.data?.entries);
    if (!entries) {
        console.warn('[Lorebook Brain] Kein entries-Array im Buch gefunden');
        return null;
    }

    const entry = erstelleEntry(fakt);
    entries.push(entry);

    await speichereBuch();
    return entry.uid;
}

export async function erstelleEintraege(fakten) {
    const uids = [];
    for (const fakt of fakten) {
        const uid = await erstelleEintrag(fakt);
        if (uid) uids.push(uid);
    }
    return uids;
}

function keywordScore(eintrag, suchwoerter) {
    const keys = (eintrag.key || '').toLowerCase();
    const content = (eintrag.content || '').toLowerCase();
    const comment = (eintrag.comment || '').toLowerCase();
    const suchText = keys + ' ' + content + ' ' + comment;

    let score = 0;
    for (const wort of suchwoerter) {
        const lower = wort.toLowerCase().trim();
        if (!lower) continue;

        const regex = new RegExp(lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = suchText.match(regex);
        if (matches) score += matches.length;

        if (keys.includes(lower)) score += 2;
        if (comment.includes(lower)) score += 1;
    }

    return score;
}

export function findeEintraege(suchwoerter, maxErgebnisse = 5) {
    if (!suchwoerter || suchwoerter.length === 0) return [];

    const eintraege = holeEintraege();
    const bewertet = eintraege
        .map(e => ({ eintrag: e, score: keywordScore(e, suchwoerter) }))
        .filter(e => e.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxErgebnisse);

    return bewertet.map(e => e.eintrag);
}

export function anzahlEintraege() {
    return holeEintraege().length;
}

export function aeltesteEintraege(n) {
    const eintraege = holeEintraege();
    return eintraege
        .slice()
        .sort((a, b) => (a.order || 100) - (b.order || 100))
        .slice(0, n);
}

export async function loescheEintraege(uids) {
    const buch = holeBuch();
    if (!buch) return 0;

    const uidSet = new Set(uids);
    let geloescht = 0;

    if (buch.entries) {
        const vorher = buch.entries.length;
        buch.entries = buch.entries.filter(e => !uidSet.has(e.uid));
        geloescht = vorher - buch.entries.length;
    } else if (buch.data?.entries) {
        const vorher = buch.data.entries.length;
        buch.data.entries = buch.data.entries.filter(e => !uidSet.has(e.uid));
        geloescht = vorher - buch.data.entries.length;
    } else {
        return 0;
    }

    if (geloescht > 0) {
        try { await speichereBuch(); } catch (e) { /* ignoriert */ }
    }
    return geloescht;
}

export function extrahiereKeywords(text) {
    if (!text) return [];

    const stoppWoerter = new Set([
        'der', 'die', 'das', 'den', 'dem', 'des',
        'ein', 'eine', 'einen', 'einem', 'einer',
        'und', 'oder', 'aber', 'auch', 'nicht', 'mit',
        'sich', 'auf', 'für', 'ist', 'war', 'hat',
        'von', 'zu', 'im', 'in', 'an', 'es', 'so',
        'als', 'wie', 'dass', 'sie', 'er', 'wir',
        'ich', 'du', 'ihr', 'mir', 'mich', 'dir', 'dich',
        'the', 'a', 'an', 'is', 'was', 'are', 'were',
        'be', 'been', 'being', 'have', 'has', 'had',
        'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'shall', 'can',
    ]);

    const woerter = text
        .toLowerCase()
        .replace(/[,.!?;:()\[\]"'`]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stoppWoerter.has(w));

    const grossGeschrieben = text
        .split(/\s+/)
        .filter(w => w.length > 1 && /^[A-ZÄÖÜ][a-zäöüß]+/.test(w));

    return [...new Set([...grossGeschrieben, ...woerter])].slice(0, 15);
}
