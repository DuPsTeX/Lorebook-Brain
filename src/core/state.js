const LS_NS = 'lorebook_brain';

let extensionSettings = null;
let chatMetadata = null;
let saveSettingsFn = null;
let saveChatFn = null;

function getPluginSettings() {
    if (!extensionSettings || !extensionSettings[LS_NS]) return null;
    return extensionSettings[LS_NS];
}

function getPluginMeta() {
    if (!chatMetadata) return null;
    if (!chatMetadata[LS_NS]) {
        chatMetadata[LS_NS] = {
            szene: {
                ort: 'Unbekannt',
                zeit: 'Unbekannt',
                wetter: 'Unbekannt',
                atmosphere: '',
            },
            charaktere: [],
            letzteEreignisse: [],
            quests: [],
            beziehungen: {},
            ausruestung: {},
            zaehler: {
                nachrichtenSeitExtraktion: 0,
                letzteExtraktionsId: -1,
                anzahlEintraege: 0,
            },
            gesperrteFelder: [],
        };
    }
    return chatMetadata[LS_NS];
}

export function initialize(context, namespace) {
    extensionSettings = context.extensionSettings;
    chatMetadata = context.chatMetadata;
    saveSettingsFn = context.saveSettingsDebounced;
    saveChatFn = context.saveChatDebounced;

    if (!getPluginSettings()) return;
    if (!getPluginMeta()) return;
}

export function getState() {
    return getPluginMeta();
}

export function getSettings() {
    return getPluginSettings();
}

export function getSzene() {
    return getPluginMeta()?.szene || {};
}

export function setSzene(update) {
    const meta = getPluginMeta();
    if (!meta) return;
    Object.assign(meta.szene, update);
    saveChatFn();
}

export function getCharaktere() {
    return getPluginMeta()?.charaktere || [];
}

export function setCharaktere(chars) {
    const meta = getPluginMeta();
    if (!meta) return;
    meta.charaktere = chars;
    saveChatFn();
}

export function getLetzteEreignisse() {
    return getPluginMeta()?.letzteEreignisse || [];
}

export function fuegeEreignisHinzu(ereignis) {
    const meta = getPluginMeta();
    if (!meta) return;
    const maxEreignisse = getPluginSettings()?.preCheck?.letzteEreignisse || 5;
    meta.letzteEreignisse.unshift(ereignis);
    if (meta.letzteEreignisse.length > maxEreignisse * 3) {
        meta.letzteEreignisse = meta.letzteEreignisse.slice(0, maxEreignisse * 3);
    }
    saveChatFn();
}

export function getBeziehungen() {
    return getPluginMeta()?.beziehungen || {};
}

export function setBeziehung(von, zu, daten) {
    const meta = getPluginMeta();
    if (!meta) return;
    const key = `${von}→${zu}`;
    meta.beziehungen[key] = { ...meta.beziehungen[key], ...daten };
    saveChatFn();
}

export function getQuests() {
    return getPluginMeta()?.quests || [];
}

export function setQuests(quests) {
    const meta = getPluginMeta();
    if (!meta) return;
    meta.quests = quests;
    saveChatFn();
}

export function getAusruestung() {
    return getPluginMeta()?.ausruestung || {};
}

export function setAusruestung(charName, items) {
    const meta = getPluginMeta();
    if (!meta) return;
    meta.ausruestung[charName] = items;
    saveChatFn();
}

export function getZaehler() {
    return getPluginMeta()?.zaehler || {};
}

export function resetExtraktionsZaehler() {
    const meta = getPluginMeta();
    if (!meta) return;
    meta.zaehler.nachrichtenSeitExtraktion = 0;
    saveChatFn();
}

export function erhoeheExtraktionsZaehler() {
    const meta = getPluginMeta();
    if (!meta) return 0;
    meta.zaehler.nachrichtenSeitExtraktion++;
    saveChatFn();
    return meta.zaehler.nachrichtenSeitExtraktion;
}

export function setLetzteExtraktionsId(msgId) {
    const meta = getPluginMeta();
    if (!meta) return;
    meta.zaehler.letzteExtraktionsId = msgId;
    saveChatFn();
}

export function sperreFeld(feld) {
    const meta = getPluginMeta();
    if (!meta) return;
    if (!meta.gesperrteFelder.includes(feld)) {
        meta.gesperrteFelder.push(feld);
        saveChatFn();
    }
}

export function entsperreFeld(feld) {
    const meta = getPluginMeta();
    if (!meta) return;
    meta.gesperrteFelder = meta.gesperrteFelder.filter(f => f !== feld);
    saveChatFn();
}

export function istGesperrt(feld) {
    return getPluginMeta()?.gesperrteFelder?.includes(feld) || false;
}

export function setEinstellung(key, value) {
    const settings = getPluginSettings();
    if (!settings) return;
    const parts = key.split('.');
    let obj = settings;
    for (let i = 0; i < parts.length - 1; i++) {
        if (obj[parts[i]] === null || obj[parts[i]] === undefined) obj[parts[i]] = {};
        obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    saveSettingsFn();
}
