import { useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, FileSpreadsheet, FlaskConical, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useApp } from '../store';
import { db } from '../db/db';
import { clearTestData, exportBackup, importBackup, loadTestData, parseBackup, resetAll, type Backup } from '../db/repo';
import { cardioCsv, saveFile, workoutsCsv } from '../lib/files';
import { dayKey, fmt, fmtClock, fmtDate } from '../lib/format';
import { beep, haptic, unlockAudio } from '../lib/feedback';
import { Btn, Card, Confirm, PageHeader, SectionTitle, Stepper, Toggle } from '../components/ui';

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[15px] font-medium">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export function SettingsScreen() {
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const reloadSettings = useApp((s) => s.reloadSettings);
  const showToast = useApp((s) => s.showToast);
  const setActive = useApp((s) => s.setActive);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [confirm, setConfirm] = useState<null | 'test' | 'reset'>(null);
  const [busy, setBusy] = useState(false);

  const counts = useLiveQuery(async () => {
    const [w, c, tw, tc] = await Promise.all([
      db.workouts.count(),
      db.cardio.count(),
      db.workouts.filter((x) => !!x.isTest).count(),
      db.cardio.filter((x) => !!x.isTest).count(),
    ]);
    return { w, c, test: tw + tc };
  }, []);

  const doExport = async () => {
    const b = await exportBackup();
    await saveFile(`gym-backup-${dayKey(Date.now())}.json`, JSON.stringify(b, null, 1), 'application/json');
  };
  const doCsv = async (kind: 'kraft' | 'cardio') => {
    if (kind === 'kraft') {
      const [w, ex] = await Promise.all([db.workouts.toArray(), db.exercises.toArray()]);
      await saveFile(`gym-saetze-${dayKey(Date.now())}.csv`, workoutsCsv(w, new Map(ex.map((e) => [e.id, e])), settings.bodyweight), 'text/csv');
    } else {
      await saveFile(`gym-cardio-${dayKey(Date.now())}.csv`, cardioCsv(await db.cardio.toArray()), 'text/csv');
    }
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      setPending(parseBackup(await f.text()));
    } catch (e) {
      showToast((e as Error).message || 'Datei konnte nicht gelesen werden');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <PageHeader title="Einstellungen" />
      <div className="px-4">
        <SectionTitle>Pausentimer</SectionTitle>
        <Card className="divide-y divide-line/60">
          <Row label="Grundübungen" hint="Standard 2:30">
            <Stepper value={settings.restCompound} onChange={(v) => update({ restCompound: v })} step={15} min={15} max={600} format={fmtClock} />
          </Row>
          <Row label="Isolationsübungen" hint="Standard 1:30">
            <Stepper value={settings.restIsolation} onChange={(v) => update({ restIsolation: v })} step={15} min={15} max={600} format={fmtClock} />
          </Row>
          <Row label="Aufwärmsätze">
            <Stepper value={settings.restWarmup} onChange={(v) => update({ restWarmup: v })} step={15} min={15} max={300} format={fmtClock} />
          </Row>
          <Row label="Ton am Ende">
            <Toggle
              label="Ton"
              on={settings.sound}
              onChange={(v) => {
                update({ sound: v });
                if (v) {
                  unlockAudio();
                  beep(1);
                }
              }}
            />
          </Row>
          <Row label="Vibration / Haptik" hint="Auf dem iPhone ab iOS 18 als Haptik-Tick">
            <Toggle
              label="Vibration"
              on={settings.vibration}
              onChange={(v) => {
                update({ vibration: v });
                if (v) setTimeout(() => haptic('success'), 30);
              }}
            />
          </Row>
        </Card>

        <SectionTitle>Training</SectionTitle>
        <Card className="divide-y divide-line/60">
          <Row label="Gewichtsschritt (+/−)">
            <Stepper value={settings.weightStep} onChange={(v) => update({ weightStep: v })} step={0.25} min={0.25} max={10} format={(v) => `${fmt(v)} kg`} />
          </Row>
          <Row label="Körpergewicht" hint="Für Klimmzüge: Volumen & 1RM">
            <Stepper value={settings.bodyweight} onChange={(v) => update({ bodyweight: v })} step={0.5} min={30} max={250} decimal />
          </Row>
          <Row label="Langhantelstange" hint="Für den Scheibenrechner">
            <Stepper value={settings.barWeight} onChange={(v) => update({ barWeight: v })} step={2.5} min={0} max={30} format={(v) => `${fmt(v)} kg`} />
          </Row>
        </Card>

        <SectionTitle>Daten & Sicherung</SectionTitle>
        <Card className="flex flex-col gap-2 p-3">
          <p className="px-1 pb-1 text-[13px] text-muted">
            {counts ? `${counts.w} Trainings · ${counts.c} Cardio-Einheiten` : '…'} – alles nur auf diesem Gerät gespeichert. Mach regelmäßig ein Backup!
          </p>
          <Btn variant="secondary" onClick={doExport}>
            <Download size={18} /> Backup exportieren (JSON)
          </Btn>
          <Btn variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={18} /> Backup importieren
          </Btn>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="secondary" className="text-[14px]" onClick={() => doCsv('kraft')}>
              <FileSpreadsheet size={17} /> CSV Kraft
            </Btn>
            <Btn variant="secondary" className="text-[14px]" onClick={() => doCsv('cardio')}>
              <FileSpreadsheet size={17} /> CSV Cardio
            </Btn>
          </div>
        </Card>

        <SectionTitle>Testdaten</SectionTitle>
        <Card className="flex flex-col gap-2 p-3">
          <p className="px-1 pb-1 text-[13px] text-muted">
            3 Wochen Beispieltrainings zum Ausprobieren von Steigerungen, Rekorden und Diagrammen.
            {counts?.test ? ` Aktuell ${counts.test} Test-Einträge.` : ''}
          </p>
          {counts?.test ? (
            <Btn variant="danger" onClick={() => setConfirm('test')}>
              <Trash2 size={18} /> Testdaten löschen
            </Btn>
          ) : (
            <Btn
              variant="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const r = await loadTestData();
                setBusy(false);
                haptic('success');
                showToast(`${r.workouts} Trainings & ${r.cardio} Cardio-Einheiten geladen`);
              }}
            >
              <FlaskConical size={18} /> Testdaten laden
            </Btn>
          )}
        </Card>

        <SectionTitle>Gefahrenzone</SectionTitle>
        <Card className="p-3">
          <Btn variant="danger" className="w-full" onClick={() => setConfirm('reset')}>
            <RotateCcw size={18} /> Alles zurücksetzen
          </Btn>
        </Card>

        <p className="mt-8 text-center text-xs text-muted">Gym Tracker 1.0 · offline · ohne Konto · Daten bleiben auf deinem Gerät</p>
      </div>

      <Confirm
        open={!!pending}
        onClose={() => setPending(null)}
        title="Backup importieren?"
        text={
          pending
            ? `Sicherung vom ${fmtDate(pending.exportedAt, { day: 'numeric', month: 'long', year: 'numeric' })} mit ${pending.workouts.length} Trainings und ${pending.cardio.length} Cardio-Einheiten. Alle aktuellen Daten werden ersetzt.`
            : ''
        }
        confirmLabel="Importieren & ersetzen"
        danger
        onConfirm={async () => {
          if (!pending) return;
          await importBackup(pending);
          await reloadSettings();
          setPending(null);
          showToast('Backup importiert');
        }}
      />
      <Confirm
        open={confirm === 'test'}
        onClose={() => setConfirm(null)}
        title="Testdaten löschen?"
        text="Nur die Beispiel-Trainings und -Cardio-Einheiten werden entfernt. Deine eigenen Einträge bleiben."
        confirmLabel="Testdaten löschen"
        danger
        onConfirm={async () => {
          await clearTestData();
          showToast('Testdaten gelöscht');
        }}
      />
      <Confirm
        open={confirm === 'reset'}
        onClose={() => setConfirm(null)}
        title="Wirklich alles löschen?"
        text="Alle Trainings, Cardio, Plan-Änderungen und Einstellungen werden gelöscht und der Standardplan wiederhergestellt. Das kann nicht rückgängig gemacht werden."
        confirmLabel="Alles löschen"
        danger
        onConfirm={async () => {
          await resetAll();
          setActive(null);
          await reloadSettings();
          showToast('App zurückgesetzt');
        }}
      />
    </>
  );
}
