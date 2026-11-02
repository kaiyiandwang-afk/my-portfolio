import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './ui/tokens.css'
import './ui/ui.css'
import './ui/panels.css'

function canRunScene() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

// The plain page is already in the HTML, so there's nothing to start when it's what the visitor needs.
if (location.search.includes('text') || !canRunScene()) {
  document.documentElement.classList.add('plain-mode')
} else {
  // While the café is running, the plain page stays readable to screen readers, but its links shouldn't catch the Tab key
  // for people who can see the page, where they'd be focus landing on nothing.
  document.querySelectorAll<HTMLElement>('#plain a').forEach((link) => (link.tabIndex = -1))
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
