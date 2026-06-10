import { prompts } from '../core/config.js';
import {
    getSzene, setSzene,
    getCharaktere, setCharaktere,
    getLetzteEreignisse, fuegeEreignisHinzu,
    getQuests, setQuests,
    getSettings,
    erhoeheExtraktionsZaehler, resetExtraktionsZaehler, setLetzteExtraktionsId,
    istGesperrt,
} from '../core/state.js';

function sammleNachrichten(chat, anzahl) {
    if (!chat || chat.length === 0) return '';

    const letzteNachrichten = chat.slice(-anzahl);
    return letzteNachrichten.map(msg => {
        const rolle = msg.is_user
            ? (msg.name || 'Spieler')
            : (msg.name || 'Charakter');
        const text = String(msg.mes || '').trim().substring(0, 1500);
        return `${rolle}: ${text}`;
    }).join('\n\n');
}

function fuellePrompt(chat) {
    const szene = getSzene();
    const anwesende = getCharaktere().map(c => c.name).join(', ') || 'Keine';
    const letzteEreignisse = getLetzteEreignisse()
        .slice(0, 3)
        .map(e => e.titel)
        .join('; ') || 'Keine';
    const anzahl = getSettings()?.memory?.nachrichtenFuerExtraktion || 8;

    return prompts.extraktion.user
        .replace('{{ort}}', szene.ort || 'Unbekannt')
        .replace('{{zeit}}', szene.zeit || 'Unbekannt')
        .replace('{{anwesende}}', anwesende)
        .replace('{{letzteEreignisse}}', letzteEreignisse)
        .replace('{{neueNachrichten}}', sammleNachrichten(chat, anzahl));
}

function parseAntwort(text) {
    const codeBlockRegex = /```(?:json)?\s*\n([\s\S]*?)\n```/;
    let jsonText = text;
    const codeMatch = text.match(codeBlockRegex);
    if (codeMatch) {
        jsonText = codeMatch[1];
    }

    try {
        return JSON.parse(jsonText.trim());
    } catch (e1) {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            try {
                return JSON.parse(text.substring(firstBrace, lastBrace + 1));
            } catch (e2) {
                return null;
            }
        }
        return null;
    }
}

function szeneAktualisieren(update) {
    const szeneUpdate = {};
    if (update.ort && !istGesperrt('szenenfenster.ort')) szeneUpdate.ort = update.ort;
    if (update.zeit && !istGesperrt('szenenfenster.zeit')) szeneUpdate.zeit = update.zeit;
    if (update.wetter && !istGesperrt('szenenfenster.wetter')) szeneUpdate.wetter = update.wetter;
    if (update.atmosphere && !istGesperrt('szenenfenster.atmosphere')) szeneUpdate.atmosphere = update.atmosphere;
    if (Object.keys(szeneUpdate).length > 0) setSzene(szeneUpdate);

    if (update.anwesendeHinzugefuegt?.length > 0) {
        const chars = getCharaktere();
        for (const name of update.anwesendeHinzugefuegt) {
            if (!chars.find(c => c.name === name)) {
                chars.push({ name, status: '', beziehung: '', gedanken: '' });
            }
        }
        setCharaktere(chars);
    }

    if (update.anwesendeEntfernt?.length > 0) {
        const entfernte = new Set(update.anwesendeEntfernt);
        setCharaktere(getCharaktere().filter(c => !entfernte.has(c.name)));
    }
}

function questsAktualisieren(update) {
    if (!update.neueQuests?.length && !update.abgeschlosseneQuests?.length) return;
    const quests = getQuests();
    for (const q of (update.neueQuests || [])) {
        const titel = typeof q === 'string' ? q : q.titel;
        if (titel && !quests.find(eq => eq.titel === titel)) {
            quests.push({ titel, abgeschlossen: false });
        }
    }
    for (const q of (update.abgeschlosseneQuests || [])) {
        const titel = typeof q === 'string' ? q : q.titel;
        const found = quests.find(eq => eq.titel === titel);
        if (found) found.abgeschlossen = true;
    }
    setQuests(quests);
}

export async function extrahiereFakten(context) {
    const counter = erhoeheExtraktionsZaehler();
    const intervall = getSettings()?.memory?.extraktionsIntervall || 1;

    if (counter < intervall) {
        return { extrahiert: false, fakten: [] };
    }

    if (!context.chat || context.chat.length === 0) {
        resetExtraktionsZaehler();
        return { extrahiert: false, fakten: [] };
    }

    resetExtraktionsZaehler();

    const systemPrompt = prompts.extraktion.system;
    const userPrompt = fuellePrompt(context.chat);

    console.log('[Lorebook Brain] Sende Extraktions-Call...');

    let antwort;
    try {
        antwort = await context.generateQuietPrompt(`${systemPrompt}\n\n${userPrompt}`);
    } catch (e) {
        console.error('[Lorebook Brain] Extraktions-Call fehlgeschlagen:', e.message);
        return { extrahiert: false, fakten: [], fehler: e.message };
    }

    if (!antwort) {
        console.warn('[Lorebook Brain] Leere Extraktions-Antwort');
        return { extrahiert: false, fakten: [] };
    }

    const daten = parseAntwort(antwort);
    if (!daten) {
        console.warn('[Lorebook Brain] JSON-Parsing fehlgeschlagen, Antwort:', antwort.substring(0, 200));
        return { extrahiert: false, fakten: [], fehler: 'JSON-Parsing fehlgeschlagen' };
    }

    if (daten.keineNeuenFakten) {
        return { extrahiert: true, fakten: [] };
    }

    if (daten.szenenUpdate) {
        szeneAktualisieren(daten.szenenUpdate);
        questsAktualisieren(daten.szenenUpdate);
    }

    const fakten = daten.neueFakten || [];
    for (const fakt of fakten) {
        fuegeEreignisHinzu({
            titel: fakt.titel || 'Unbenannter Fakt',
            inhalt: fakt.inhalt || '',
            kategorie: fakt.kategorie || 'ereignis',
            keywords: fakt.keywords || [],
            zeitstempel: Date.now(),
        });
    }

    if (context.chat && context.chat.length > 0) {
        setLetzteExtraktionsId(context.chat.length - 1);
    }

    console.log(`[Lorebook Brain] Extraktion: ${fakten.length} Fakten extrahiert`);
    return { extrahiert: true, fakten };
}
