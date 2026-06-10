import { prompts } from '../core/config.js';
import {
    getSzene, getCharaktere, getLetzteEreignisse,
    getSettings,
} from '../core/state.js';
import { findeEintraege, extrahiereKeywords } from './lorebook.js';

function formatiereCharakterKerne() {
    const chars = getCharaktere();
    if (!chars || chars.length === 0) return 'Keine';
    return chars.map(c => {
        const teile = [c.name];
        if (c.status) teile.push(c.status);
        if (c.beziehung) teile.push(c.beziehung);
        return teile.join(': ');
    }).join('; ');
}

function letzteUserNachricht(chat) {
    if (!chat || chat.length === 0) return '';
    for (let i = chat.length - 1; i >= 0; i--) {
        if (chat[i].is_user) {
            return chat[i].mes || '';
        }
    }
    return '';
}

export async function preCheck(context) {
    const settings = getSettings();
    if (!settings?.preCheck || settings.preCheck.modus === 'nie') {
        return [];
    }

    if (settings.preCheck.modus === 'beiVielen') {
        const { anzahlEintraege } = await import('./lorebook.js');
        const schwelle = settings.preCheck.schwelleVieleEintraege || 50;
        if (anzahlEintraege() < schwelle) {
            return [];
        }
    }

    const userNachricht = letzteUserNachricht(context.chat);
    if (!userNachricht.trim()) return [];

    const szene = getSzene();
    const letzteEreignisse = getLetzteEreignisse()
        .slice(0, settings.preCheck.letzteEreignisse || 3)
        .map(e => e.titel)
        .join('\n- ');

    const prompt = prompts.preCheck.user
        .replace('{{ort}}', szene.ort || 'Unbekannt')
        .replace('{{zeit}}', szene.zeit || 'Unbekannt')
        .replace('{{anwesende}}', getCharaktere().map(c => c.name).join(', ') || 'Keine')
        .replace('{{charakterKerne}}', formatiereCharakterKerne())
        .replace('{{letzteEreignisse}}', letzteEreignisse ? `- ${letzteEreignisse}` : 'Keine')
        .replace('{{userNachricht}}', userNachricht.substring(0, 500));

    console.log('[Lorebook Brain] Sende Pre-Check...');

    let antwort;
    try {
        antwort = await context.generateQuietPrompt(
            `${prompts.preCheck.system}\n\n${prompt}`
        );
    } catch (e) {
        console.warn('[Lorebook Brain] Pre-Check fehlgeschlagen:', e.message);
        return [];
    }

    if (!antwort || antwort.trim().toUpperCase() === 'OK') {
        return [];
    }

    const match = antwort.match(/FEHLT:\s*(.+)/i);
    if (!match) return [];

    const suchwoerter = match[1]
        .split(/[,;]/)
        .map(w => w.trim())
        .filter(w => w.length > 1);

    if (suchwoerter.length === 0) return [];

    console.log('[Lorebook Brain] Pre-Check: Suche nach', suchwoerter);
    const maxE = settings.injection?.maxErinnerungen || 5;
    return findeEintraege(suchwoerter, maxE);
}

export async function holeRelevanteEintraege(context) {
    const preCheckErgebnisse = await preCheck(context);
    if (preCheckErgebnisse.length > 0) {
        return preCheckErgebnisse;
    }

    const userNachricht = letzteUserNachricht(context.chat);
    if (!userNachricht.trim()) return [];

    const keywords = extrahiereKeywords(userNachricht);
    const maxE = getSettings()?.injection?.maxErinnerungen || 5;
    return findeEintraege(keywords, maxE);
}
