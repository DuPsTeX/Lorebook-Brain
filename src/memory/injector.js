import {
    getSzene, getCharaktere, getBeziehungen,
} from '../core/state.js';
import { holeRelevanteEintraege } from './retriever.js';

function formatiereChars() {
    const chars = getCharaktere();
    if (!chars || chars.length === 0) return '';
    return chars.map(c => {
        const teile = [c.name];
        if (c.status) teile.push(c.status);
        if (c.beziehung) teile.push(c.beziehung);
        return teile.join(': ');
    }).join('; ');
}

function formatiereErinnerungen(eintraege) {
    if (!eintraege || eintraege.length === 0) return '';
    return eintraege.map((e, i) => {
        const titel = e.comment || '';
        const inhalt = (e.content || '').replace(/^\[.+\]\s*/gm, '').substring(0, 120);
        return `(${i + 1}) ${titel}: ${inhalt}`;
    }).join(' ');
}

function formatiereBeziehungen() {
    const beziehungen = getBeziehungen();
    const keys = Object.keys(beziehungen);
    if (keys.length === 0) return '';
    return keys.map(key => {
        const b = beziehungen[key];
        const werte = [];
        if (b.vertrauen !== undefined) werte.push(`V${b.vertrauen}`);
        if (b.respekt !== undefined) werte.push(`R${b.respekt}`);
        if (b.romantik !== undefined) werte.push(`Ro${b.romantik}`);
        return `${key}(${werte.join('/')})`;
    }).join('; ');
}

export async function injiziereGedaechtnis(context) {
    const relevante = await holeRelevanteEintraege(context);

    const segmente = [
        `[Kontext:`,
        `Ort: ${getSzene().ort || '?'}; Zeit: ${getSzene().zeit || '?'};`,
    ];

    const chars = formatiereChars();
    if (chars) segmente.push(`Anwesend: ${chars};`);

    const erinnerungen = formatiereErinnerungen(relevante);
    if (erinnerungen) segmente.push(`Erinnerungen: ${erinnerungen};`);

    const beziehungen = formatiereBeziehungen();
    if (beziehungen) segmente.push(`Beziehungen: ${beziehungen};`);

    segmente.push(']');
    const text = segmente.join(' ');

    context.setExtensionPrompt('lorebook-brain', text, 0, 0);
}
