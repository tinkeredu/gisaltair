import { useEffect } from 'react'
import { Dialog } from './Dialog'
import { GUIDE_STEPS } from './guideSteps'

export function Guide({ index, onIndex, onClose }: { index: number; onIndex: (index: number) => void; onClose: () => void }) {
  const step = GUIDE_STEPS[index]
  useEffect(() => {
    const el = step.target ? document.querySelector(`[data-guide="${step.target}"]`) : null
    el?.classList.add('guide-highlight')
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    return () => { el?.classList.remove('guide-highlight') }
  }, [step])
  return <Dialog title={`Guide · ${index + 1}/${GUIDE_STEPS.length}`} onClose={onClose}>
    <h3>{step.title}</h3><p>{step.text}</p>
    <div className="guide-buttons"><button className="btn" onClick={onClose}>Beenden</button><span /><button className="btn" onClick={() => onIndex(index - 1)} disabled={index === 0}>Zurück</button><button className="btn primary" onClick={() => index === GUIDE_STEPS.length - 1 ? onClose() : onIndex(index + 1)}>{index === GUIDE_STEPS.length - 1 ? 'Fertig' : 'Weiter'}</button></div>
  </Dialog>
}
