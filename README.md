# Gym Tracker

Offline-fähige Trainings-App (PWA) für das iPhone: Gewichte schnell eintragen, automatische Steigerung (Double Progression), PRs, Pausentimer, Statistik und Cardio. Alle Daten bleiben lokal auf dem Gerät (IndexedDB), ohne Konto und ohne Server.

## Lokal starten

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Unit-Tests für Steigerung, PRs, Scheibenrechner, Testdaten
npm run build      # Produktions-Build nach dist/
```

Auf dem iPhone im selben WLAN testen: `npm run dev` zeigt eine „Network"-Adresse (z. B. `http://192.168.0.23:5173`). Die kannst du in Safari öffnen. Offline-Modus und „Zum Home-Bildschirm" als echte App funktionieren aber erst über **https**, also nach dem Veröffentlichen.

## Veröffentlichen – Variante A: GitHub Pages (kostenlos)

1. Auf github.com ein neues Repository anlegen, z. B. `gym-tracker` (öffentlich; bei privaten Repos braucht Pages ein bezahltes Konto).
2. Im Projektordner:
   ```bash
   git init
   git add .
   git commit -m "Gym Tracker"
   git branch -M main
   git remote add origin https://github.com/DEIN-NAME/gym-tracker.git
   git push -u origin main
   ```
3. Im Repository: **Settings → Pages → Build and deployment → Source: „GitHub Actions"** auswählen.
4. Unter **Actions** läuft jetzt „Auf GitHub Pages veröffentlichen" (ca. 1–2 Minuten). Danach ist die App erreichbar unter
   `https://DEIN-NAME.github.io/gym-tracker/`
5. Jeder weitere `git push` veröffentlicht automatisch die neue Version.

> Der Workflow setzt den Pfad (`/gym-tracker/`) automatisch aus dem Repo-Namen. Falls das Repo `DEIN-NAME.github.io` heißt, in `.github/workflows/deploy.yml` die Zeile `BASE_PATH` auf `/` ändern.

## Veröffentlichen – Variante B: Vercel (kostenlos)

1. Code wie oben auf GitHub hochladen (Schritte 1–2).
2. Auf vercel.com mit GitHub anmelden → **Add New → Project** → Repository auswählen.
3. Vercel erkennt Vite automatisch (Build: `npm run build`, Output: `dist`). Einfach **Deploy** klicken.
4. Die App läuft unter `https://gym-tracker-xyz.vercel.app`. Jeder Push aktualisiert sie automatisch.

## Auf dem iPhone installieren

1. Die veröffentlichte Adresse in **Safari** öffnen (nicht Chrome; nur Safari kann unter iOS Web-Apps installieren).
2. Unten auf **Teilen** (Quadrat mit Pfeil nach oben) tippen.
3. Nach unten scrollen → **„Zum Home-Bildschirm"** → **Hinzufügen**.
4. Die App über das neue Icon starten: Sie läuft im Vollbild, ohne Browserleiste, und funktioniert ab jetzt auch offline.

Updates: Nach einem neuen Deployment lädt die App die neue Version beim nächsten Öffnen automatisch im Hintergrund. Spätestens beim zweiten Start ist sie aktiv.

## Wichtig zu den Daten

- Alles liegt im Speicher **dieser** Web-App auf deinem iPhone. Löschst du die App vom Home-Bildschirm, sind die Daten weg.
- Darum regelmäßig unter **Einstellungen → Backup exportieren** sichern (über das Teilen-Menü → „In Dateien sichern").
- Ein Backup lässt sich jederzeit wieder importieren, auch auf einem neuen Gerät.

## Funktionen im Überblick

- **Heute:** nächster Tag in der Rotation (antippen zum Wechseln), Vorschau mit Steigerungen, „Training starten"
- **Workout:** Sätze vorausgefüllt, ±-Buttons, Zahlentastatur, Haken → Pausentimer startet automatisch, Swipe links = löschen (mit Rückgängig), Tipp auf die Satznummer = Aufwärmsatz/Duplizieren/Löschen, Notizen, Scheibenrechner, Auto-Save, Bildschirm bleibt an
- **Double Progression:** alle Sätze am oberen Ende → „Steigern!" mit + Inkrement (pro Übung im Plan einstellbar), sonst Ziel +1 Wdh.
- **PRs:** Höchstgewicht, geschätztes 1RM (Epley), meiste Wdh. bei einem Gewicht → Konfetti + Haptik
- **Statistik:** Kalender-Heatmap, Wochen-Streak, Wochenvolumen pro Muskelgruppe, Verlauf je Übung (Top-Satz & 1RM)
- **Cardio:** Rudergerät/Bike/Laufband, Intervalle oder Zone 2, eigener Verlauf mit Diagramm
- **Plan:** Tage und Übungen hinzufügen, umbenennen, löschen, per Griff sortieren; Sätze, Wdh.-Bereich, Pause, Steigerung
- **Einstellungen:** Pausenzeiten, Körpergewicht, Stange, JSON-Backup, CSV-Export, Testdaten laden/löschen

## Projektstruktur

```
src/
  db/          Dexie-Datenbank, Standardplan, Testdaten, Backup
  lib/         Steigerung, PR-Erkennung, Statistik, Scheibenrechner, Haptik/Ton
  components/  Satzzeile, Übungskarte, Pausentimer, Navigation, UI-Bausteine
  screens/     Heute, Workout, Zusammenfassung, Verlauf, Cardio, Statistik, Plan, Einstellungen
```
