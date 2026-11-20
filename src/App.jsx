import { Suspense, useState } from 'react'
import { useProgress } from '@react-three/drei'
import SideMenu from './SideMenu'
import LoadingStatus from './LoadingStatus'
import { WORKS, pickWork } from './works'
import './App.css'

/* The page is a film title card: one full-bleed still, the name along the
   bottom edge, the piece's credits beside it. `useProgress` lives here (top
   level, outside Suspense) so the card can wait for the first frame — the
   loading line is replaced in place by the credits, never stacked on them. */
export default function App() {
  const [work, setWork] = useState(() => pickWork())
  const { active, progress, errors } = useProgress()
  const ready = errors.length > 0 || (progress === 100 && !active)
  const Scene = work.Comp

  return (
    <div className="app">
      <Suspense fallback={null}>
        <Scene key={work.id} />
      </Suspense>

      <div className="scrim" aria-hidden="true" />
      <div className="riso" aria-hidden="true" />

      <LoadingStatus active={active} progress={progress} errors={errors} />

      <SideMenu works={WORKS} activeId={work.id} onSelect={setWork} />

      <footer className={`card${ready ? ' is-ready' : ''}`}>
        <div className="card__row">
          <div className="card__credits">
            <div className="card__piece">
              <span className="card__numeral">No. {work.numeral}</span>
              <h2 className="card__work">{work.title}</h2>
            </div>
            <p className="card__inscription">{work.inscription}</p>
            <p className="card__meta">
              {work.medium}, {work.year}
            </p>
          </div>
          <p className="card__epigraph">
            What the hand makes,
            <br />
            the light keeps.
          </p>
        </div>
        <h1 className="wordmark">marcxime</h1>
      </footer>
    </div>
  )
}
