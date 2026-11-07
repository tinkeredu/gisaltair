import { useEffect, useRef, type ReactNode } from 'react'

export function Dialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = ref.current!
    el.showModal()
    return () => { el.close() }
  }, [])
  return <dialog ref={ref} aria-label={title} onCancel={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose() }} className={`native-dialog ${wide ? 'wide' : ''}`}>
    <div className="dialog-title"><h2>{title}</h2><button className="btn" aria-label="Schließen" onClick={onClose}>×</button></div>
    <div className="dialog-content">{children}</div>
  </dialog>
}
