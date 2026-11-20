import { useEffect, useRef, useState } from 'react'
import './SideMenu.css'

const CONTACT = [{ label: 'GitHub', href: 'https://github.com/marc23gold' }]

const FOCUSABLE = 'a[href], button:not([disabled])'

export default function SideMenu({ works, activeId, onSelect }) {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef(null)
  const closeRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        toggleRef.current?.focus()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll(FOCUSABLE)]
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    // The open panel covers the toggle; move focus into the dialog instead.
    closeRef.current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const handleSelect = (work) => {
    onSelect(work)
    setOpen(false)
    toggleRef.current?.focus()
  }

  const handleClose = () => {
    setOpen(false)
    toggleRef.current?.focus()
  }

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="index-toggle"
        aria-expanded={open}
        aria-controls="index-panel"
        aria-label={open ? 'Close index' : 'Index'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="index-toggle__label">Index</span>
        <span className="index-toggle__glyph" aria-hidden="true">
          <i />
          <i />
        </span>
      </button>

      <button
        type="button"
        className={`index-backdrop${open ? ' is-open' : ''}`}
        aria-label="Close index"
        tabIndex={open ? 0 : -1}
        onClick={handleClose}
      />

      <div
        id="index-panel"
        ref={panelRef}
        className={`index-panel${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal={open}
        aria-label="Index"
      >
        <div className="index-panel__header">
          <span className="index-panel__title">Index</span>
          <button
            ref={closeRef}
            type="button"
            className="index-panel__close"
            aria-label="Close index"
            onClick={handleClose}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="3" x2="15" y2="15" />
              <line x1="3" y1="15" x2="15" y2="3" />
            </svg>
          </button>
        </div>

        <nav className="index-group" aria-label="Work">
          <p className="index-group__label">Work</p>
          <ul className="index-works">
            {works.map((work) => {
              const active = work.id === activeId
              return (
                <li key={work.id}>
                  <button
                    type="button"
                    className={`work${active ? ' is-active' : ''}`}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => handleSelect(work)}
                  >
                    <span className="work__numeral" aria-hidden="true">
                      {work.numeral}
                    </span>
                    <span className="work__body">
                      <span className="work__title">{work.title}</span>
                      <span className="work__meta">
                        {work.medium}, {work.year}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <section className="index-group">
          <p className="index-group__label">Studio</p>
          <p className="index-prose">
            I make small monuments in the browser — stone, obsolete machines, a travelling beam.
            Each study begins as a found object and ends as light.
          </p>
        </section>

        <nav className="index-group" aria-label="Contact">
          <p className="index-group__label">Contact</p>
          <ul className="index-links">
            {CONTACT.map(({ label, href }) => (
              <li key={label}>
                <a className="index-link" href={href} target="_blank" rel="noreferrer">
                  {label}
                  <span className="index-link__arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="index-panel__footer">
          <p className="index-group__label">Colophon</p>
          <p className="index-panel__mark" aria-hidden="true">
            marcxime
          </p>
          <p>Set in Cormorant Garamond and Lora.</p>
          <p>Built with React Three Fiber.</p>
          <p className="index-panel__copyright">© 2026</p>
        </footer>
      </div>
    </>
  )
}
