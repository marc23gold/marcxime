import './LoadingStatus.css'

/* The loading line sits where the credits will land, then is replaced by them:
   a cold visit reads "loading 42%", a loaded one reads the piece's credits.
   Progress numbers are hidden from the accessibility tree so a screen reader
   hears "Loading" once instead of every percent. */
export default function LoadingStatus({ active, progress, errors }) {
  const done = progress === 100 && !active
  if (done || errors.length > 0) return null

  const waiting = !active && progress === 0

  return (
    <p
      className={`loading-status${waiting ? ' is-waiting' : ''}`}
      role="status"
    >
      Loading
      {!waiting && (
        <span className="loading-status__pct" aria-hidden="true">
          {Math.round(progress)}%
        </span>
      )}
    </p>
  )
}
