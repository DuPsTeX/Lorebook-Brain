const defaultSettings = {
    memory: {
        extraktionsIntervall: 1,
        nachrichtenFuerExtraktion: 8,
        maxLorebookEintraege: 100,
        konsolidierungsSchwelle: 50,
    },
    preCheck: {
        modus: 'immer',
        letzteEreignisse: 3,
        schwelleVieleEintraege: 50,
    },
    injection: {
        maxErinnerungen: 5,
        tokenBudgetProzent: 20,
    },
    lorebook: {
        dateiName: null,
        anChatGebunden: false,
    },
    szenenfenster: {
        panelPosition: 'rechts',
        felderAnzeigen: ['ort', 'zeit', 'charaktere', 'ausruestung', 'quests'],
    },
};

const prompts = {
    extraktion: {
        system: `Du bist ein Analyse-Assistent für eine laufende Rollenspiel-Geschichte.
Deine Aufgabe: Analysiere die neuen Chat-Nachrichten und extrahiere daraus wichtige Fakten und aktualisiere den aktuellen Szenenzustand.

WICHTIGE FAKTEN umfassen:
- Neue Charaktere (Name, Rasse, Aussehen, wichtige Eigenschaften)
- Ortswechsel (neuer Ort, Beschreibung)
- Beziehungsänderungen (Vertrauen, Feindschaft, Romantik, etc.)
- Emotionale Entwicklungen (Gefühlsumschwung, neue Motivation)
- Wichtige Gegenstände (gefunden, verloren, genutzt)
- Plot-Entwicklungen (neue Quests, abgeschlossene Ziele, Wendungen)
- Widersprüche zu bereits etablierten Fakten

IGNORIERE:
- Banale Dialogfloskeln ohne Informationsgehalt
- Wiederholungen bereits bekannter Fakten
- Rein atmosphärische Beschreibungen ohne Substanz

Jeder Fakt MUSS als eigenständiger, verständlicher Satz formuliert sein, der auch ohne den Chat-Verlauf verstanden wird.`,

        user: `Analysiere den folgenden Chat-Ausschnitt und den aktuellen Szenenzustand.

[AKTUELLER SZENENZUSTAND]
Ort: {{ort}}
Zeit: {{zeit}}
Anwesende Charaktere: {{anwesende}}
Letzte Ereignisse: {{letzteEreignisse}}

[NEUE NACHRICHTEN]
{{neueNachrichten}}

Antworte NUR mit gültigem JSON im folgenden Format:
{
  "neueFakten": [
    {
      "titel": "Kurzer, prägnanter Titel (max 8 Wörter)",
      "inhalt": "Ausführliche, eigenständig verständliche Beschreibung des Fakts (1-3 Sätze)",
      "kategorie": "charakter|ort|beziehung|gegenstand|quest|ereignis|emotion",
      "keywords": ["schlüsselwort1", "schlüsselwort2", "schlüsselwort3"]
    }
  ],
  "szenenUpdate": {
    "ort": "Neuer Ort oder null wenn unverändert",
    "zeit": "Neue Zeit oder null wenn unverändert",
    "wetter": "Neues Wetter oder null wenn unverändert",
    "anwesendeHinzugefuegt": ["Name1"],
    "anwesendeEntfernt": ["Name2"],
    "neueQuests": ["Quest-Beschreibung"],
    "abgeschlosseneQuests": ["Quest-Beschreibung"]
  },
  "keineNeuenFakten": false
}

Wenn keine neuen Fakten vorhanden sind, setze "keineNeuenFakten" auf true und lasse die anderen Felder leer.`,
    },

    preCheck: {
        system: `Du bist ein Wissens-Prüfer für eine Rollenspiel-Geschichte. 
Du erhältst den aktuellen Szenenzustand und die neueste Nachricht des Spielers.
Deine Aufgabe: Entscheide, ob du für eine gute, konsistente Antwort ZUSÄTZLICHES Wissen aus der Vergangenheit brauchst.

Frage dich:
- Werden Charaktere oder Orte erwähnt, über die du mehr wissen solltest?
- Bezieht sich die Spieler-Nachricht auf ein vergangenes Ereignis?
- Könnte eine vergessene Information die Antwort verbessern?
- Gibt es laufende Quests oder Konflikte, die relevant sein könnten?

Wenn du NICHTS brauchst, antworte EXAKT: OK
Wenn du etwas brauchst, antworte: FEHLT: suchbegriff1, suchbegriff2, suchbegriff3

Die Suchbegriffe sollen präzise Stichworte sein (z.B. Charaktername, Ortsname, Gegenstand).
MAXIMAL 5 Suchbegriffe. Keine ganzen Sätze.`,

        user: `[SITUATION]
Ort: {{ort}}
Zeit: {{zeit}}
Anwesend: {{anwesende}}

[WISSEN ÜBER ANWESENDE CHARAKTERE]
{{charakterKerne}}

[LETZTE EREIGNISSE]
{{letzteEreignisse}}

[PLAYER SAGT GERADE]
{{userNachricht}}

Was fehlt dir an Wissen für eine gute Antwort?`,
    },

    konsolidierung: {
        system: `Du fasst mehrere ältere Einträge einer Rollenspiel-Geschichte zu einem kompakten Kapitel-Zusammenfassung zusammen.
Behalte alle wichtigen Fakten, Charakterentwicklungen und Plot-Punkte.
Entferne Redundanzen und unwichtige Details.
Formuliere prägnant und eigenständig verständlich.

Ausgabeformat:
TITEL: Kurzer Titel für das Kapitel
INHALT: 3-6 Sätze, die die Kernereignisse zusammenfassen
KEYWORDS: komma, separierte, schlüsselwörter`,
    },
};

export { defaultSettings, prompts };
