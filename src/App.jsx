import StatueScene from './StatueScene'
import './App.css'

const GITHUB_URL = 'https://github.com/marc23gold'

export default function App() {
  return (
    <div className="app">
      <StatueScene />
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
