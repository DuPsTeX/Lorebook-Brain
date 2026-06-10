import { setEinstellung } from '../core/state.js';

export async function initSettings(context) {
    const template = await context.renderExtensionTemplateAsync('lorebook_brain', 'settings');
    const elSettings = document.querySelector('#extensions_settings');
    if (!elSettings) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'lb-settings-wrapper';
    wrapper.innerHTML = template;
    elSettings.appendChild(wrapper);

    const settings = context.extensionSettings.lorebook_brain || {};

    setVal('lb-set-extract-interval', settings.memory?.extraktionsIntervall);
    setVal('lb-set-extract-count', settings.memory?.nachrichtenFuerExtraktion);
    setVal('lb-set-max-entries', settings.memory?.maxLorebookEintraege);
    setVal('lb-set-consolidation', settings.memory?.konsolidierungsSchwelle);
    setVal('lb-set-precheck-mode', settings.preCheck?.modus);
    setVal('lb-set-precheck-events', settings.preCheck?.letzteEreignisse);
    setVal('lb-set-max-memories', settings.injection?.maxErinnerungen);
    setVal('lb-set-token-budget', settings.injection?.tokenBudgetProzent);
    setVal('lb-set-panel-pos', settings.szenenfenster?.panelPosition);

    bindSettings();
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') {
        el.checked = !!val;
    } else if (el.tagName === 'SELECT' || el.tagName === 'INPUT') {
        el.value = val ?? '';
    }
}

function bindSettings() {
    bind('lb-set-extract-interval', 'memory.extraktionsIntervall', parseInt);
    bind('lb-set-extract-count', 'memory.nachrichtenFuerExtraktion', parseInt);
    bind('lb-set-max-entries', 'memory.maxLorebookEintraege', parseInt);
    bind('lb-set-consolidation', 'memory.konsolidierungsSchwelle', parseInt);
    bind('lb-set-precheck-mode', 'preCheck.modus');
    bind('lb-set-precheck-events', 'preCheck.letzteEreignisse', parseInt);
    bind('lb-set-max-memories', 'injection.maxErinnerungen', parseInt);
    bind('lb-set-token-budget', 'injection.tokenBudgetProzent', parseInt);
    bind('lb-set-panel-pos', 'szenenfenster.panelPosition');
}

function bind(id, key, transform) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
        let val = el.type === 'checkbox' ? el.checked : el.value;
        if (transform) val = transform(val);
        setEinstellung(key, val);
        console.log(`[Lorebook Brain] Einstellung ${key} = ${val}`);
    });
}
