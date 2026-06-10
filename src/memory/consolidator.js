import { prompts } from '../core/config.js';
import { getSettings } from '../core/state.js';
import { anzahlEintraege, aeltesteEintraege, loescheEintraege, erstelleEintrag } from './lorebook.js';

function parseKonsolidierungsAntwort(text) {
    const titelMatch = text.match(/TITEL:\s*(.+?)(?:\n|$)/);
    const inhaltMatch = text.match(/INHALT:\s*([\s\S]+?)(?=\nKEYWORDS:|$)/);
    const keywordsMatch = text.match(/KEYWORDS:\s*(.+?)(?:\n|$)/);

    return {
        titel: titelMatch ? titelMatch[1].trim() : '',
        inhalt: inhaltMatch ? inhaltMatch[1].trim() : '',
        keywords: keywordsMatch
            ? keywordsMatch[1].split(/[,;]/).map(w => w.trim()).filter(Boolean)
            : [],
    };
}

export async function konsolidiereFallsNoetig(context) {
    const settings = getSettings();
    const schwelle = settings?.memory?.konsolidierungsSchwelle || 50;
    const max = settings?.memory?.maxLorebookEintraege || 100;

    const anzahl = anzahlEintraege();
    if (anzahl < schwelle) return null;

    const zuViele = anzahl > max;
    const batchGroesse = zuViele ? Math.min(30, anzahl - max + 10) : 20;

    console.log(`[Lorebook Brain] Konsolidierung: ${anzahl} Einträge, fasse ${batchGroesse} zusammen`);

    const alte = aeltesteEintraege(batchGroesse);
    if (alte.length < 5) return null;

    const eintraegeText = alte.map((e, i) => {
        const content = (e.content || '').replace(/^\[.+\]\s*/gm, '').trim();
        return `Eintrag ${i + 1}: ${content}`;
    }).join('\n\n');

    const userPrompt = `Fasse folgende ältere Einträge der Geschichte zu einer kompakten Zusammenfassung zusammen.\n\n${eintraegeText}`;

    console.log('[Lorebook Brain] Sende Konsolidierungs-Call...');

    let antwort;
    try {
        antwort = await context.generateQuietPrompt(
            `${prompts.konsolidierung.system}\n\n${userPrompt}`
        );
    } catch (e) {
        console.error('[Lorebook Brain] Konsolidierungs-Call fehlgeschlagen:', e.message);
        return null;
    }

    if (!antwort || antwort.trim().length < 20) {
        console.warn('[Lorebook Brain] Konsolidierung: Leere oder zu kurze Antwort');
        return null;
    }

    const daten = parseKonsolidierungsAntwort(antwort);

    if (!daten.titel || !daten.inhalt) {
        console.warn('[Lorebook Brain] Konsolidierung: Parsing unvollständig', daten);
        return null;
    }

    const uids = alte.map(e => e.uid);
    const geloescht = await loescheEintraege(uids);

    const uid = await erstelleEintrag({
        titel: `[Zusammenfassung] ${daten.titel}`,
        inhalt: daten.inhalt,
        kategorie: 'konsolidierung',
        keywords: daten.keywords.length > 0 ? daten.keywords : ['zusammenfassung'],
        zeitstempel: Date.now(),
    });

    console.log(`[Lorebook Brain] Konsolidierung: ${geloescht} gelöscht, Zusammenfassung erstellt (${uid || '?'})`);
    return { geloescht, neuerUid: uid, titel: daten.titel };
}
