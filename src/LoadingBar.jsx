import { useProgress } from '@react-three/drei'
import './LoadingBar.css'

export default function LoadingBar() {
  const { active, progress, errors } = useProgress()

  // Model fetch failed — never show a stuck bar.
  if (errors.length > 0) return null

  const done = progress === 100 && !active
  // Pre-start gap: bar is present (small pulsing sliver) before the fetch begins.
  const waiting = !active && progress === 0

  let className = 'loading-bar'
  if (waiting) className += ' loading-bar--waiting'
  if (done) className += ' loading-bar--done'

  return (
    <div
      className={className}
      style={{ width: waiting ? '12%' : `${progress}%` }}
      aria-hidden="true"
    />
  )
}