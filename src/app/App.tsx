import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Cpu } from '../core/cpu'
import { EXAMPLES } from '../core/examples'
import { binary, disassemble, encode, hex, OP_BY_CODE, OPS, valueText } from '../core/isa'
import { isMemory, parseMemory, parseNumber, parsePc1, readStored, serializeMemory, serializePc1, writeStored } from '../core/storage'
import { Bits } from './Bits'
import { Dialog } from './Dialog'
import { Guide } from './Guide'
import { GUIDE_STEPS } from './guideSteps'
import { MenuBar } from './Menu'
import { Reference } from './Reference'
import { useMachine } from './useMachine'

const REPO = 'https://github.com/tinkeredu/gisaltair'
const SKINS = [{ id: 'auto', label: 'Automatisch' }, { id: 'light', label: 'Hell' }, { id: 'dark', label: 'Dunkel' }, { id: 'classic', label: 'Klassisch' }, { id: 'terminal', label: 'Terminal' }] as const
type Skin = typeof SKINS[number]['id']
type Mode = 'binary' | 'symbolic' | 'decimal' | 'hex'
const storagePath = window.location.pathname.replace(/\/index\.html?$/i, '').replace(/\/+$/, '') || '/'
const storageKey = (name: string) => 'altair:' + storagePath + '.' + name
function readStoredMigrated<T>(name: string, legacy: string, fallback: T, valid: (value: unknown) => value is T): T {
  const key = storageKey(name)
  let hasCurrent = false
  try { hasCurrent = localStorage.getItem(key) !== null } catch { hasCurrent = true }
  if (!hasCurrent) {
    const migrated = readStored(legacy, null as unknown as T, valid)
    if (migrated !== null) {
      writeStored(key, migrated)
      return migrated
    }
  }
  return readStored(key, fallback, valid)
}

function Panel({ title, target, children, className = '' }: { title: string; target?: string; children: ReactNode; className?: string }) {
  return <section className={`group-box ${className}`} data-guide={target}><h2 className="legend">{title}</h2>{children}</section>
}

function NumberField({ label, value, onChange, max = 65535, min = -32768, disabled = false }: { label: string; value: number; onChange: (n: number) => void; max?: number; min?: number; disabled?: boolean }) {
  const [draft, setDraft] = useState({ original: value, text: String(value), error: false })
  const text = draft.original === value ? draft.text : String(value)
  const error = draft.original === value && draft.error
  return <form className="number-form" onSubmit={(e) => {
    e.preventDefault()
    const n = parseNumber(text, max, min)
    setDraft({ original: value, text, error: n === null })
    if (n !== null) onChange(n)
  }}>
    <label>{label}<input aria-invalid={error} value={text} disabled={disabled} onChange={(e) => setDraft({ original: value, text: e.target.value, error: false })} autoComplete="off" spellCheck={false} /></label>
    <button className="btn" disabled={disabled}>Übernehmen</button>
    {error && <span className="field-error" role="alert">Ganze Zahl von {min} bis {max} eingeben (auch 0x… / 0b…).</span>}
  </form>
}

function download(name: string, contents: BlobPart, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function revealMemoryRow(row: HTMLButtonElement | null | undefined) {
  const list = row?.parentElement
  if (!row || !list) return
  const cell = row.getBoundingClientRect()
  const viewport = list.getBoundingClientRect()
  if (cell.top < viewport.top) list.scrollTop -= viewport.top - cell.top
  else if (cell.bottom > viewport.bottom) list.scrollTop += cell.bottom - viewport.bottom
}

export default function App() {
  const [initial] = useState(() => readStoredMigrated('memory', 'altair.memory', EXAMPLES[0].memory, isMemory))
  const m = useMachine(initial)
  const { cpu } = m
  const [skin, setSkin] = useState<Skin>(() => readStoredMigrated('skin', 'altair.skin', 'auto', (v): v is Skin => SKINS.some((s) => s.id === v)))
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [showControl, setShowControl] = useState(() => readStoredMigrated('control', 'altair.control', false, (v): v is boolean => typeof v === 'boolean'))
  const [showArDr, setShowArDr] = useState(() => readStoredMigrated('ardr', 'altair.ardr', false, (v): v is boolean => typeof v === 'boolean'))
  const [commandMode, setCommandMode] = useState(() => readStored(storageKey('commandmode'), false, (v): v is boolean => typeof v === 'boolean'))
  const [address, setAddress] = useState(0)
  const [mode, setMode] = useState<Mode>('binary')
  const [follow, setFollow] = useState(true)
  const [input, setInput] = useState(0)
  const [fileName, setFileName] = useState('programm.altair.json')
  const [dialog, setDialog] = useState<'reference' | 'basic' | 'about' | 'examples' | 'clear' | null>(null)
  const [pending, setPending] = useState<{ memory: number[]; name: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [storageError, setStorageError] = useState(false)
  const [guide, setGuide] = useState<number | null>(null)
  const [snapshot, setSnapshot] = useState<{ cpu: Cpu; address: number; fileName: string; follow: boolean; input: number } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([])
  const memString = JSON.stringify(cpu.mem)
  const busy = m.running || cpu.state === 'input'
  const word = cpu.mem[address]
  const op = OP_BY_CODE.get(word >>> 8)
  const registers: [string, number][] = [
    ...(showControl ? [['PC', cpu.pc], ['IR', cpu.ir]] as [string, number][] : []),
    ...(showArDr ? [['AR', cpu.ar], ['DR', cpu.dr]] as [string, number][] : []),
  ]

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const changed = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    query.addEventListener('change', changed)
    return () => query.removeEventListener('change', changed)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.skin = skin === 'auto' ? systemDark ? 'dark' : 'light' : skin
    writeStored(storageKey('skin'), skin)
  }, [skin, systemDark])
  useEffect(() => { writeStored(storageKey('control'), showControl) }, [showControl])
  useEffect(() => { writeStored(storageKey('ardr'), showArDr) }, [showArDr])
  useEffect(() => { writeStored(storageKey('commandmode'), commandMode) }, [commandMode])
  useEffect(() => {
    // Synchronize the availability of the browser's persistent storage.
    // oxlint-disable-next-line react/set-state-in-effect
    if (guide === null) setStorageError(!writeStored(storageKey('memory'), JSON.parse(memString)))
  }, [memString, guide])
  useEffect(() => {
    if (follow) revealMemoryRow(rowRefs.current[cpu.pc])
  }, [cpu.pc, follow])

  const select = (n: number) => {
    setAddress(n & 255)
    revealMemoryRow(rowRefs.current[n & 255])
  }
  const write = (n: number) => {
    if (busy) return
    cpu.setWord(address, n)
    m.refresh()
  }
  const load = (memory: number[], name: string) => {
    m.load(memory); setAddress(0); setFileName(name); setFollow(true); setNotice('Programm geladen. Der Prozessor steht auf Adresse 0.'); setPending(null); setDialog(null)
  }
  const requestLoad = (memory: number[], name: string) => { m.pause(); setPending({ memory, name }); setDialog(null) }
  const enterGuide = (index: number) => {
    m.load(EXAMPLES[0].memory)
    if (index >= 4) cpu.step()
    if (index >= 7) cpu.step()
    setAddress(index === 3 ? 8 : 0)
    setGuide(index)
  }
  const startGuide = () => {
    m.pause(); setDialog(null)
    setSnapshot({ cpu: structuredClone(cpu), address, fileName, follow, input })
    enterGuide(0)
  }
  const endGuide = () => {
    if (snapshot) {
      Object.assign(cpu, snapshot.cpu)
      setAddress(snapshot.address); setFileName(snapshot.fileName); setFollow(snapshot.follow); setInput(snapshot.input)
    }
    m.refresh(); setSnapshot(null); setGuide(null)
  }
  const status = cpu.state === 'input' ? `Warte auf Eingabe für Zelle ${cpu.inputAddress}.` : cpu.state === 'halted' ? 'Programm beendet (STOP).' : cpu.state === 'error' ? cpu.error : m.running ? 'Programm läuft …' : 'Bereit.'

  return <div className="app-shell">
    <header className="app-header"><div className="brand-mark" aria-hidden="true">A<span>16</span></div><div><h1>Altair</h1><p>Modellrechner · Binär programmieren</p></div><span className="header-spacer" /><button className="btn" onClick={startGuide}>Guide starten</button></header>
    <MenuBar menus={[
      { label: 'Datei', items: [
        { label: 'Programm laden …', onSelect: () => { m.pause(); fileInput.current?.click() } },
        { label: 'Programm speichern …', onSelect: () => { m.pause(); download(fileName.replace(/(?:\.altair)?\.(?:json|pc1)$/i, '') + '.altair.json', serializeMemory(cpu.mem)); setNotice('Aktuellen Speicher als Altair-Datei heruntergeladen.') } },
        { label: 'Als PC1 speichern …', onSelect: () => { m.pause(); download(fileName.replace(/(?:\.altair)?\.(?:json|pc1)$/i, '') + '.pc1', serializePc1(cpu.mem), 'application/octet-stream'); setNotice('Aktuellen Speicher im originalen PC1-Binärformat heruntergeladen.') } },
        { label: 'Beispiel laden …', onSelect: () => { m.pause(); setDialog('examples') } },
      ] },
      { label: 'Speicher', items: [{ label: 'Speicher löschen …', onSelect: () => { m.pause(); setDialog('clear') } }] },
      { label: 'Ansicht', items: [
        { label: 'Befehlswahl (Operationswort)', checked: commandMode, onSelect: () => setCommandMode(!commandMode) },
        { label: 'Steuerwerk (PC, IR)', checked: showControl, onSelect: () => setShowControl(!showControl) },
        { label: 'AR/DR-Register', checked: showArDr, onSelect: () => setShowArDr(!showArDr) },
        ...SKINS.map((s, i) => ({ label: s.label, checked: skin === s.id, separator: i === 0, onSelect: () => setSkin(s.id) })),
      ] },
      { label: 'Hilfe', items: [
        { label: 'Guide starten', onSelect: startGuide },
        { label: 'Befehlssatz (einfach)', onSelect: () => setDialog('basic') },
        { label: 'Befehlssatz (komplett)', onSelect: () => setDialog('reference') },
        { label: 'Fehler melden', onSelect: () => window.open(`${REPO}/issues/new`, '_blank', 'noopener,noreferrer') },
        { label: 'Über Altair', onSelect: () => setDialog('about') },
      ] },
    ]} />
    <input ref={fileInput} hidden type="file" accept=".json,.pc1,application/json" onChange={async (e) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      try {
        if (file.size > 100000) throw new Error('Die Datei ist zu groß (max. 100 kB).')
        const memory = file.name.toLowerCase().endsWith('.pc1') ? parsePc1(await file.arrayBuffer()) : parseMemory(await file.text())
        requestLoad(memory, file.name)
      } catch (error) { setNotice(error instanceof Error ? error.message : 'Die Datei konnte nicht geladen werden.') }
    }} />
    <main className="workspace">
      <div className="machine-column">
        <div className="section-heading"><div><span className="eyebrow">Programmierung</span><h2>Schalter setzen. Programm bauen.</h2></div><span className="chip">256 × 16 Bit</span></div>
        <div className="programming-grid">
          <Panel title="Speicheradresse" target="address">
            <Bits value={address} label="Speicheradresse" onChange={select} disabled={m.running} />
            <div className="address-nav"><button className="btn" aria-label="Vorherige Speicheradresse" disabled={m.running} onClick={() => select(address - 1)}>−</button><strong className="font-mono">{String(address).padStart(3, '0')}</strong><button className="btn" aria-label="Nächste Speicheradresse" disabled={m.running} onClick={() => select(address + 1)}>+</button><span>0x{hex(address, 2)}</span></div>
            <NumberField label="Gehe zu Adresse" value={address} max={255} min={0} onChange={select} disabled={m.running} />
          </Panel>
          <Panel title={`Befehlswort · Zelle ${String(address).padStart(3, '0')}`} target="word" className="word-panel">
            <div className="word-halves"><div><h3>Operationsteil <span>Bit 15–8</span></h3>{commandMode && <div className="command-picker"><label>Befehl<select aria-label="Befehl wählen" value={op ? String(op.code) : ''} disabled={busy} onChange={(e) => { if (e.target.value !== '') write(encode(Number(e.target.value), word & 255)) }}><option value="">Unbekannt ({word >>> 8})</option>{OPS.map((instruction) => <option key={instruction.code} value={String(instruction.code)}>{instruction.name}{instruction.operand ? ' X' : ''}</option>)}</select></label><div className="byte-summary">Opcode {word >>> 8} · {binary(word >>> 8, 8)}</div></div>}<Bits value={word >>> 8} label="Operationsteil" onChange={(n) => write((n << 8) | (word & 255))} disabled={busy} /><div className="byte-summary">{word >>> 8} · {op?.name ?? 'Unbekannt'}</div></div><div><h3>Adressteil <span>Bit 7–0</span></h3><Bits value={word & 255} label="Adressteil" onChange={(n) => write((word & 0xff00) | n)} disabled={busy} /><div className="byte-summary">{word & 255}{op && !op.operand ? ' · ohne Bedeutung' : ''}</div></div></div>
            <div className="word-summary"><code>{binary(word)}</code><span>0x{hex(word)} · {valueText(word)}</span></div>
            <NumberField key={address} label="Ganzes Wort (dezimal / 0x / 0b)" value={word} onChange={write} disabled={busy} />
          </Panel>
        </div>
        <div className="io-grid">
          <Panel title="Dateneingabe" target="input" className={cpu.state === 'input' ? 'input-waiting' : ''}>
            <Bits value={input >>> 8} label="Eingabe oberes Byte" onChange={(n) => setInput((n << 8) | (input & 255))} />
            <Bits value={input & 255} label="Eingabe unteres Byte" onChange={(n) => setInput((input & 0xff00) | n)} />
            <NumberField label="Eingabewert" value={input} onChange={(n) => setInput(n & 65535)} />
            <div className="input-confirm"><span>{cpu.state === 'input' ? `INM → Zelle ${cpu.inputAddress}` : 'Wird bei INM angefordert'}</span><button className="btn primary" disabled={cpu.state !== 'input'} onClick={() => m.provideInput(input)}>Eingabe bestätigen</button></div>
            <p className="text-muted input-hint">Zahlenfeld zuerst mit „Übernehmen“ bestätigen, danach die Eingabe an die CPU senden.</p>
          </Panel>
          <Panel title="Datenausgabe" target="output">
            <div className="output-value">{cpu.output.length ? valueText(cpu.output.at(-1)!) : '—'}<span>{cpu.output.length ? `0x${hex(cpu.output.at(-1)!)}` : 'Noch keine Ausgabe'}</span></div>
            <div className="led-display"><Bits value={cpu.output.at(-1) ?? 0} count={16} label="Ausgabe-LEDs" /><div className="led-labels"><span>15</span><span>8</span><span>7</span><span>0</span></div></div>
            <details className="output-log"><summary>Ausgabeprotokoll ({cpu.output.length})</summary><ol>{cpu.output.map((n, i) => <li key={i}><code>{valueText(n)} · {binary(n)}</code></li>)}</ol>{!cpu.output.length && <p>Das Programm hat noch nichts ausgegeben.</p>}</details>
          </Panel>
        </div>
        <div className="execution-grid">
          <Panel title="Programmsteuerung" target="controls">
            <div className="control-buttons"><button className="btn" disabled={cpu.state !== 'ready' || m.running} onClick={m.step}>▸ Einzelschritt</button><button className="btn primary" disabled={cpu.state !== 'ready' || m.running} onClick={m.run}>▶ Start</button><button className="btn" disabled={!m.running} onClick={m.pause}>Ⅱ Pause</button><button className="btn" onClick={m.reset}>■ Reset</button></div>
            <label className="delay-label">Pause nach jedem Befehl <strong>{m.delay} ms</strong><input aria-label="Pause nach jedem Befehl" type="range" min={0} max={1500} step={50} value={m.delay} onChange={(e) => m.setDelay(Number(e.target.value))} /></label>
            <p className="text-muted">Reset setzt den Prozessor zurück. Der Speicher bleibt erhalten.</p>
          </Panel>
          <Panel title="Akkumulator · AC" target="ac"><div className="acc accumulator"><code>{binary(cpu.ac)}</code><strong>{valueText(cpu.ac)}</strong><span>0x{hex(cpu.ac)}</span></div></Panel>
        </div>
        {(showControl || showArDr) && <Panel title="Optionale Register"><div className="register-grid">{registers.map(([name, value]) => <div key={name}><span>{name}</span><code>{value} · 0x{hex(value, name === 'PC' || name === 'AR' ? 2 : 4)}</code>{name === 'IR' && <small>{disassemble(value)}</small>}</div>)}</div></Panel>}
      </div>
      <Panel title="Speicherwerk" target="memory" className="memory-panel">
        <div className="memory-toolbar"><label>Anzeige<select aria-label="Speicheranzeige" value={mode} onChange={(e) => setMode(e.target.value as Mode)}><option value="binary">Binär</option><option value="symbolic">Symbolisch</option><option value="decimal">Dezimal</option><option value="hex">Hexadezimal</option></select></label><label><input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> PC folgen</label></div>
        <div className="memory-head"><span>Adr.</span><span>{mode === 'binary' ? 'Operation · Adresse' : 'Inhalt'}</span></div>
        <div className="memory-list" aria-label="Speicherzellen">{cpu.mem.map((n, i) => <button ref={(el) => { rowRefs.current[i] = el }} key={i} className={`memory-row ${address === i ? 'selected' : ''} ${cpu.pc === i ? 'at-pc' : ''}`} aria-label={`Zelle ${i}: ${binary(n)}, ${disassemble(n)}`} aria-pressed={address === i} disabled={m.running} onClick={() => select(i)}><span className="memory-address"><span>{cpu.pc === i ? '▸' : ''}</span>{String(i).padStart(3, '0')}</span><code>{mode === 'binary' ? binary(n) : mode === 'symbolic' ? disassemble(n) : mode === 'hex' ? `0x${hex(n)}` : valueText(n)}</code></button>)}</div>
        <div className="memory-foot"><span>▸ Programmzähler</span><span className="selection-key">Ausgewählt: {address}</span></div>
      </Panel>
    </main>
    <footer className={`statusbar ${cpu.state === 'error' ? 'error' : ''}`}><span className={`status-dot ${m.running ? 'running' : ''}`} /><span role="status">{status}</span><span className="header-spacer" /><span>{cpu.steps} Befehle</span><span>{storageError ? 'Autosicherung nicht möglich – bitte Datei speichern' : 'Speicher lokal gesichert'}</span></footer>
    {notice && <div className="notice" role="status"><span>{notice}</span><button className="btn" aria-label="Meldung schließen" onClick={() => setNotice(null)}>×</button></div>}
    {(dialog === 'reference' || dialog === 'basic') && <Dialog title="Altair-Befehlssatz" wide onClose={() => setDialog(null)}><Reference initialBasic={dialog === 'basic'} /></Dialog>}
    {dialog === 'about' && <Dialog title="Über Altair" onClose={() => setDialog(null)}><h3>Altair · Web-Version 1.0.0</h3><p>Nachbau des Unterrichts-Modellrechners von J. Schmidt. 256 Speicherzellen, 16-Bit-Wörter und 23 Befehle. Kein Emulator des echten Intel-8080-Prozessors des Altair 8800.</p><p>Alle Berechnungen und Dateien bleiben in deinem Browser. Es gibt kein Backend und keine Telemetrie.</p><p><a href={REPO} target="_blank" rel="noreferrer">Projekt auf GitHub</a></p></Dialog>}
    {dialog === 'examples' && <Dialog title="Beispielprogramm laden" onClose={() => setDialog(null)}><div className="example-list">{EXAMPLES.map((example) => <button key={example.name} className="btn" onClick={() => requestLoad(example.memory, 'programm.altair.json')}><strong>{example.name}</strong><span>{example.description}</span></button>)}</div></Dialog>}
    {dialog === 'clear' && <Dialog title="Speicher löschen?" onClose={() => setDialog(null)}><p>Alle 256 Speicherzellen und der Prozessor werden auf 0 zurückgesetzt. Speichere dein Programm vorher als Datei, wenn du es behalten möchtest.</p><div className="dialog-actions"><button className="btn" onClick={() => setDialog(null)}>Abbrechen</button><button className="btn danger" onClick={() => load(Array(256).fill(0), 'programm.altair.json')}>Speicher löschen</button></div></Dialog>}
    {pending && <Dialog title="Aktuellen Speicher ersetzen?" onClose={() => setPending(null)}><p>Der aktuelle Speicher wird durch das gewählte Programm ersetzt. Speichere ihn vorher, wenn du ihn behalten möchtest.</p><div className="dialog-actions"><button className="btn" onClick={() => setPending(null)}>Abbrechen</button><button className="btn primary" onClick={() => load(pending.memory, pending.name)}>Programm laden</button></div></Dialog>}
    {guide !== null && <Guide index={guide} onIndex={(index) => { if (index >= 0 && index < GUIDE_STEPS.length) enterGuide(index) }} onClose={endGuide} />}
  </div>
}
