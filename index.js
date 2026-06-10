import { initialize } from './src/core/state.js';
import { defaultSettings } from './src/core/config.js';
import { extrahiereFakten } from './src/memory/extractor.js';
import { initLorebook, stelleBuchBereit, erstelleEintraege } from './src/memory/lorebook.js';
import { injiziereGedaechtnis } from './src/memory/injector.js';
import { konsolidiereFallsNoetig } from './src/memory/consolidator.js';
import { initDashboard, aktualisiereDashboard } from './src/scenes/dashboard.js';
import { initSettings } from './src/ui/settings.js';

const context = (typeof SillyTavern !== 'undefined') ? SillyTavern.getContext() : null;

(function init() {
    if (!context) {
        console.error('[Lorebook Brain] SillyTavern Kontext nicht verfügbar');
        return;
    }

    const pluginNs = 'lorebook_brain';

    if (!context.extensionSettings[pluginNs]) {
        context.extensionSettings[pluginNs] = structuredClone(defaultSettings);
        context.saveSettingsDebounced();
    } else {
        context.extensionSettings[pluginNs] = Object.assign(
            {},
            defaultSettings,
            context.extensionSettings[pluginNs]
        );
    }

    initialize(context, pluginNs);
    initLorebook(context, context.extensionSettings[pluginNs]);

    const modulUrl = import.meta.url || '';
    const extOrdner = modulUrl.split('/scripts/extensions/')[1]?.split('/')[0]
        || modulUrl.split('/third-party/')[1]?.split('/')[0]
        || 'Lorebook-Brain';

    initDashboard(context, extOrdner);
    initSettings(context, extOrdner);

    context.eventSource.on(context.event_types.MESSAGE_RECEIVED, async () => {
        const result = await extrahiereFakten(context).catch(err => {
            console.error('[Lorebook Brain] Extraktions-Exception:', err);
            return null;
        });

        if (!result || result.fehler) {
            if (result?.fehler) console.warn('[Lorebook Brain] Extraktions-Fehler:', result.fehler);
            return;
        }

        if (result.fakten && result.fakten.length > 0) {
            await stelleBuchBereit();
            const uids = await erstelleEintraege(result.fakten);
            if (uids.length > 0) {
                console.log(`[Lorebook Brain] ${uids.length} Lorebook-Einträge gespeichert`);
            }
            konsolidiereFallsNoetig(context).catch(err => {
                console.warn('[Lorebook Brain] Konsolidierungs-Fehler:', err);
            });
            aktualisiereDashboard();
        }
    });

    context.eventSource.on(context.event_types.GENERATION_STARTED, () => {
        stelleBuchBereit().then(() => {
            injiziereGedaechtnis(context).catch(err => {
                console.warn('[Lorebook Brain] Injection-Fehler:', err);
            });
        });
    });

    context.eventSource.on(context.event_types.CHAT_CHANGED, () => {
        console.log('[Lorebook Brain] Chat gewechselt, State wird neu geladen');
        initialize(context, pluginNs);
        initLorebook(context, context.extensionSettings[pluginNs]);
        aktualisiereDashboard();
    });

    console.log('[Lorebook Brain] Extension v0.1.0 geladen');
})();
