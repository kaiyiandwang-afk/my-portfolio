import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { renderJsonLd, renderPlainHtml } from './src/plainHtml'

export default defineConfig({
  plugins: [
    react(),
    {
      // Puts the site's words into the page itself, so they exist before any JavaScript runs.
      name: 'plain-html',
      transformIndexHtml: (html) => html.replace('<!--plain-content-->', renderPlainHtml()).replace('<!--json-ld-->', `<script type="application/ld+json">${renderJsonLd()}</script>`),
    },
  ],
  build: {
    chunkSizeWarningLimit: 1800, // the 3D scene is one chunk on purpose, and loads after the page has appeared
  },
})
