import { lazy, Suspense, useState } from 'react'
import { isMobile } from './mobile'
import './App.css'

/* Each scene is a self-contained full-screen Canvas. Code-split every scene
   and pick one at random per page load, so a visit only downloads the JS +
   model for the chosen piece. On mobile we weight the lighter scenes higher. */

const MarbleSpotlight = lazy(() => import('./MarbleSpotlight'))
const LaptopStatue = lazy(() => import('./LaptopStatue'))

/* Two pieces remain: Lucy (708 KB GLB) and the laptop (lighter once its
   textures are re-encoded). On mobile we weight the lighter Lucy higher. */
const SCENES = [
  { Comp: MarbleSpotlight, weight: isMobile ? 2 : 1 }, // Lucy
  { Comp: LaptopStatue, weight: isMobile ? 1 : 1 },
]

const GITHUB_URL = 'https://github.com/marc23gold'

function pickScene(list) {
  const total = list.reduce((sum, s) => sum + s.weight, 0)
  let r = Math.random() * total
  for (const s of list) {
    r -= s.weight
    if (r <= 0) return s.Comp
  }
  return list[list.length - 1].Comp
}

export default function App() {
  const [Scene] = useState(() => pickScene(SCENES))

  return (
    <div className="app">
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
      <div className="riso" aria-hidden="true" />
      <header className="title">
        <h1>marcxime</h1>
        <p>a work in progress</p>
      </header>
      <footer className="links">
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">
          github.com/marc23gold
        </a>
      </footer>
    </div>
  )
}
