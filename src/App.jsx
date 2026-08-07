import { useState } from 'react'
import MarbleSpotlight from './MarbleSpotlight'
import HorseStatue from './HorseStatue'
import HandsStatue from './HandsStatue'
import './App.css'

const GITHUB_URL = 'https://github.com/marc23gold'

/* Each scene is a self-contained full-screen Canvas. Pick one at random once
   per page load so a different statue shows each visit. */
const SCENES = [MarbleSpotlight, HorseStatue, HandsStatue]

export default function App() {
  const [Scene] = useState(() => SCENES[Math.floor(Math.random() * SCENES.length)])

  return (
    <div className="app">
      <Scene />
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
