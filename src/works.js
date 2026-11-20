import { lazy } from 'react'
import { isMobile } from './mobile'

/* The studies. Each one is a self-contained full-screen Canvas, code-split so a
   visit only downloads the JS + model for the chosen piece; the index in the
   drawer swaps between them. `inscription` is the line that sits beside the
   piece on the title card — the factual `medium`/`year` stay separate. */
export const WORKS = [
  {
    id: 'victory',
    numeral: 'I',
    title: 'Winged Victory',
    inscription: 'Marble, and the wind it was carved from.',
    medium: 'WebGL study',
    year: '2026',
    Comp: lazy(() => import('./MarbleSpotlight')),
    weight: isMobile ? 2 : 1,
  },
  {
    id: 'portable',
    numeral: 'II',
    title: 'Portable Computer',
    inscription: 'A small lamp that remembers paper.',
    medium: 'WebGL study',
    year: '2026',
    Comp: lazy(() => import('./LaptopStatue')),
    weight: 1,
  },
]

/* Weighted draw for the first frame: on a phone the lighter piece comes up more
   often, so a cold visit is less likely to sit through the heavier download. */
export function pickWork(list = WORKS) {
  const total = list.reduce((sum, w) => sum + w.weight, 0)
  let r = Math.random() * total
  for (const w of list) {
    r -= w.weight
    if (r <= 0) return w
  }
  return list[list.length - 1]
}
