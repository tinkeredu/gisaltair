import { useEffect, useRef, useState } from 'react'

export interface MenuItem {
  label: string
  onSelect: () => void
  checked?: boolean
  separator?: boolean
}

export function MenuBar({ menus }: { menus: { label: string; items: MenuItem[] }[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const ref = useRef<HTMLElement>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(null)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <nav ref={ref} data-guide="menu" className="menubar relative flex select-none" aria-label="Hauptmenü" onKeyDown={(e) => {
      if (e.key === 'Escape' && open !== null) {
        e.preventDefault()
        buttons.current[open]?.focus()
        setOpen(null)
      }
    }}>
      {menus.map((m, i) => (
        <div key={m.label} className="relative">
          <button
            type="button"
            ref={(el) => { buttons.current[i] = el }}
            aria-haspopup="menu"
            aria-expanded={open === i}
            className={`px-2 py-0.5 ${open === i ? 'bg-sel text-sel-fg' : ''}`}
            onClick={() => setOpen(open === i ? null : i)}
            onMouseEnter={() => open !== null && setOpen(i)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault()
                setOpen(i)
                requestAnimationFrame(() => {
                  const items = ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
                  items?.[e.key === 'ArrowUp' ? items.length - 1 : 0]?.focus()
                })
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault()
                const next = (i + (e.key === 'ArrowLeft' ? -1 : 1) + menus.length) % menus.length
                if (open !== null) setOpen(next)
                buttons.current[next]?.focus()
              }
            }}
          >
            {m.label}
          </button>
          {open === i && (
            <div role="menu" aria-label={m.label} className="absolute top-full left-0 z-40 min-w-44 menu-pop py-0.5" onKeyDown={(e) => {
              const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
              const current = items.indexOf(document.activeElement as HTMLButtonElement)
              const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : e.key === 'ArrowDown' ? (current + 1) % items.length : e.key === 'ArrowUp' ? (current - 1 + items.length) % items.length : null
              if (next !== null) { e.preventDefault(); items[next]?.focus() }
              if (e.key === 'Tab') setOpen(null)
            }}>
              {m.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className={`flex w-full gap-2 px-2 py-0.5 text-left hover:bg-sel hover:text-sel-fg ${item.separator ? 'mt-0.5 border-t border-line pt-1' : ''}`}
                  onClick={() => {
                    setOpen(null)
                    item.onSelect()
                    buttons.current[i]?.focus()
                  }}
                >
                  <span className="w-3">{item.checked ? '✓' : ''}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}
