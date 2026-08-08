import { useEffect, useState } from 'react'
import './SideMenu.css'

const GITHUB_URL = 'https://github.com/marc23gold'

export default function SideMenu() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className={`side-menu${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="side-menu__toggle"
        aria-expanded={open}
        aria-controls="side-menu-panel"
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
      >
        menu
      </button>
      <div
        id="side-menu-panel"
        className="side-menu__panel"
        role="region"
        aria-label="Menu links"
      >
        <a
          className="side-menu__link"
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          onClick={() => setOpen(false)}
        >
          github.com/marc23gold
        </a>
      </div>
    </div>
  )
}