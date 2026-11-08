# Altair · Modellrechner als Webapp

Browser-Nachbau des Unterrichtsprogramms **Altair / PC1** von J. Schmidt. Programme werden wie im Original direkt als **binäre Befehlswörter** in den Speicher eingegeben – nicht über einen Assembler. Die Oberfläche übernimmt die modernen Skins und die schlanke Bedienung der [Mnemo-Webapp](https://github.com/tinkeredu/gismnemo).

> Dies ist der Unterrichts-Modellrechner, kein Intel-8080-Emulator des historischen Altair 8800.

## Funktionen

- 256 Speicherzellen mit je 16 Bit, Akkumulator und Programmzähler.
- Adresse und Befehlswort mit Bit-Schaltern bearbeiten. Jede Schalteränderung landet sofort im Speicher. Zusätzlich sind Zahlenfelder für Dezimal-, `0x`-Hex- und `0b`-Binärwerte verfügbar.
- Optionaler Befehlswahl-Modus (Menü „Ansicht“): Ein Altair-Befehl wird ausgewählt und sein Opcode binär in den Operationsteil übernommen.
- Einzelschritt, Start, Pause, Reset und einstellbare Pause nach jedem Befehl. Auch Endlosschleifen lassen sich anhalten.
- 16-Bit-Eingabe und Ausgabe-LEDs. Bei `INM` wartet die CPU auf eine bestätigte Eingabe. Danach mit Start oder Einzelschritt fortsetzen.
- Binäre, symbolische, dezimale und hexadezimale Speicheransicht, intern scrollbar, mit Adressauswahl und „PC folgen“.
- Alle **23 dokumentierten Altair-Befehle**, mit Original-Operationscodes. Keine zusätzlichen Mnemo-/Stackbefehle.
- Durchsuchbare integrierte Befehlsreferenz (einfach/komplett), keine separaten HTML-Hilfedateien nötig.
- Neunstufiger Guide mit vorgeführtem Beispiel. Speicher und CPU-Zustand werden beim Schließen wiederhergestellt; der Guide überschreibt die Autosicherung nicht.
- Beispiele: Zahl ausgeben, Addition, Countdown und Endlosschleife. Keine Aufgabenblätter.
- Fünf Skins: Automatisch, Hell, Dunkel, Klassisch und Terminal. PC/IR und AR/DR sind standardmäßig ausgeblendet und unter „Ansicht“ zuschaltbar.
- Dateidownload/-import und lokale Autosicherung des aktuellen Speichers. Keine Anmeldung, kein Backend, keine Telemetrie und keine externen Ressourcen.
- Responsive Oberfläche für Desktop, Tablet und Smartphone; Bedienelemente mit Tastatur nutzbar.

## Erstes Programm

Beim ersten Start ist dieses kleine Programm geladen:

| Adresse | Binäres Speicherwort | Symbolisch / Wert |
|---|---|---|
| 0 | `0001 1000 0000 1000` | `OUTM 8` |
| 1 | `0010 0111 0000 0000` | `STOP` |
| 8 | `0000 0000 0000 1101` | Datenwert 13 |

Einmal „Einzelschritt“ gibt 13 aus; der zweite Schritt beendet das Programm. Über Datei → Beispiel laden gibt es weitere Programme.

### Eingabe und Reset

Bei `INM` die Eingabeschalter setzen oder einen Wert ins Zahlenfeld schreiben und „Übernehmen“ drücken. Anschließend **„Eingabe bestätigen“** wählen. Die CPU speichert den Wert in die angeforderte Zelle. Danach mit Start oder Einzelschritt fortsetzen.

**Reset setzt nur die CPU und die Ausgabe zurück, nicht den Speicher.** Laufzeitänderungen bleiben erhalten, wie im Original. Für einen unveränderten Neustart die gespeicherte Datei oder das Beispiel erneut laden. „Speicher löschen“ entfernt auch das Programm, nach Rückfrage.

### Zahlen und Befehle

Die oberen 8 Bit eines Befehlsworts sind der Operationscode, die unteren 8 Bit die Adresse. Für `ADD 8` ist das beispielsweise `0000 1001 0000 1000` = `0x0908`.

Arithmetik läuft modulo 65536; negative Werte werden im Zweierkomplement gelesen. `NEG` ist wie dokumentiert eine **Bit-Invertierung**, kein arithmetisches Minus. `SHR` schiebt links eine 0 nach. Bedingte Sprünge prüfen den vorzeichenbehafteten AC. `NOP` hat den Code 0, `STOP` den Code 39. Unbekannte Operationscodes führen zu einer verständlichen Fehlermeldung, nicht zu stiller Ausführung.

| Gruppe | Befehle |
|---|---|
| Datentransport | `LDA` `STA` `INM` `OUTM` |
| Arithmetik/Logik | `ADD` `SUB` `NEG` `INC` `DEC` `AND` `OR` `XOR` `SHL` `SHR` |
| Sprünge | `JMP` `JMS` `JPL` `JZE` `JNM` `JNP` `JNZ` |
| Steuerung | `NOP` `STOP` |

## Speichern

Datei → Programm speichern lädt den aktuellen Speicher als versionierte `*.altair.json`-Datei herunter. Eine Datei enthält genau 256 ganze Zahlen von 0 bis 65535; fehlerhafte Dateien werden vor dem Laden zurückgewiesen. Vor dem Ersetzen des Speichers fragt die App nach.

Die automatische Sicherung bleibt im selben Browser und unter demselben Webspace-Pfad erhalten (altair:<pfad>.memory). Dadurch überschreiben sich zwei Altair-Installationen auf derselben Domain in verschiedenen Unterordnern nicht gegenseitig. Sie ist kein Ersatz für einen Dateidownload: Löschen der Browserdaten, Privatmodus oder ein Wechsel von Browser/Gerät/Domain kann sie entfernen. Die Ausgabeliste enthält maximal die letzten 1000 Werte.

Über **„Als PC1 speichern“** ist außerdem das binäre Originalformat verfügbar. Vorhandene `*.pc1`-Dateien lassen sich ebenfalls laden: 512 Byte, bestehend aus 256 vorzeichenlosen 16-Bit-Wörtern in Little-Endian-Reihenfolge, ohne Header. Das Format wurde am Original untersucht; JSON-Dateien sind das besser lesbare Webformat. Beide Formate speichern den Speicher, nicht die CPU-Register oder ein pausiertes Programm.

## Installation auf dem Webserver

1. Die **Server-ZIP** entpacken.
2. Den gesamten Inhalt (inklusive `assets/`) auf den Webspace kopieren – auch ein Unterordner ist möglich.
3. Über **HTTP/HTTPS** öffnen. Ein Doppelklick per `file://` funktioniert wegen der Browser-Sicherheitsregeln für Module nicht.

Auf dem Server werden **weder Node.js noch PHP noch eine Datenbank** benötigt. Ein Update ersetzt die Dateien im selben Ordner; zuvor gespeicherte Browserdaten bleiben erhalten. Im Zweifel die Seite neu laden. Es wird kein Service Worker installiert.

## Entwicklung

Voraussetzung: [Node.js](https://nodejs.org/) ab **22.12**, empfohlen Node 22 LTS.

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

```sh
npm test          # CPU, Befehlsnummern, Beispiele und Dateivalidierung
npm run lint     # oxlint
npm run build    # TypeScript + statischer Produktionsbuild in dist/
npm run preview  # Produktionsbuild lokal ansehen
```

Vite verwendet relative Assetpfade (`base: './'`), damit der Build auf beliebigem Webspace in Unterordnern funktioniert.

| Verzeichnis | Inhalt |
|---|---|
| `src/core` | UI-unabhängige CPU, Befehlssatz, Dateiformat und Tests |
| `src/app` | Bit-Schalter, Panels, Menüs, Hilfe und Guide |
| `src/index.css` | Responsive Oberfläche und Skins |

Technik: React, TypeScript, Vite, Tailwind CSS, Vitest und oxlint. Ohne Änderungen an den Originaldateien; die Windows-EXE und die beigefügten Dokumente sind nicht im Repository enthalten. Grundlage sind der Altair-Befehlssatz, die Einführung und die Untersuchung des Originals unter Wine.
