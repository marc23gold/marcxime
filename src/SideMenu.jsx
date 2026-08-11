import { useEffect, useRef, useState } from 'react'
import './SideMenu.css'

const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com/marc23gold', external: true },
]

function MenuIcon({ kind }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    'aria-hidden': 'true',
  }
  return (
    <svg {...common}>
      {kind === 'menu' ? (
        <>
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </>
      ) : (
        <>
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </>
      )}
    </svg>
  )
}

export default function SideMenu() {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    // The open panel covers the toggle; move focus into the dialog instead.
    closeRef.current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const handleClose = () => {
    setOpen(false)
    toggleRef.current?.focus()
  }

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="side-menu__toggle"
        aria-expanded={open}
        aria-controls="side-menu-panel"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <MenuIcon kind="menu" />
      </button>

      <button
        type="button"
        className={`side-menu__backdrop${open ? ' is-open' : ''}`}
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={handleClose}
      />

      <div
        id="side-menu-panel"
        className={`side-menu__panel${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal={open}
        aria-label="Menu"
      >
        <div className="side-menu__panel-header">
          <span className="side-menu__panel-title">Menu</span>
          <button
            ref={closeRef}
            type="button"
            className="side-menu__close"
            aria-label="Close menu"
            onClick={handleClose}
          >
            <MenuIcon kind="close" />
          </button>
        </div>

        <nav className="side-menu__nav" aria-label="Social">
          <p className="side-menu__section-label">Social</p>
          <ul className="side-menu__list">
            {SOCIAL_LINKS.map(({ label, href, external }) => (
              <li key={label}>
                <a
                  className="side-menu__link"
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noreferrer' : undefined}
                  onClick={handleClose}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="side-menu__footer">
          <p>marcxime — a work in progress</p>
        </footer>
      </div>
    </>
  )
}