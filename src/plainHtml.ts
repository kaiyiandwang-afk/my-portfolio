import { about, art, cats, contact, creative, experience, interests, projects, research, resume, sections, site, skills, work } from './content'
import type { Card, SectionId } from './content'

/**
 * Every word of the site as plain HTML, written into index.html at build time. Screen readers and crawlers read it, and
 * it's what people see with ?text, without JavaScript, or on a device that can't run WebGL.
 */
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function card({ title, role, dates, status, body, bullets, tags, links }: Card) {
  return [
    `<article><h3>${escape(title)}</h3>`,
    role ? `<p><strong>${escape(role)}</strong></p>` : '',
    dates ? `<p>${escape(dates)}</p>` : '',
    status ? `<p>${escape(status)}</p>` : '',
    body ? `<p>${escape(body)}</p>` : '',
    bullets ? `<ul>${bullets.map((b) => `<li>${escape(b)}</li>`).join('')}</ul>` : '',
    tags ? `<p>${tags.map(escape).join(' · ')}</p>` : '',
    links ? links.map((l) => `<p><a href="${escape(l.href)}">${escape(l.label)}</a></p>`).join('') : '',
    '</article>',
  ].join('')
}

/** Skips images still marked as placeholders, so nobody reads out "Placeholder 1". */
const realImages = <T extends { alt: string }>(images: T[]) => images.filter(({ alt }) => !/placeholder/i.test(alt))

const BODIES: Record<SectionId, () => string> = {
  about: () =>
    [
      card(about.education),
      `<ul>${about.stats.map((s) => `<li>${escape(s.label)}: ${escape(s.value)}</li>`).join('')}</ul>`,
      `<h3>Coursework</h3><ul>${about.coursework.map((c) => `<li>${escape(c)}</li>`).join('')}</ul>`,
      card(about.working),
    ].join(''),
  projects: () =>
    [
      projects.map(card).join(''),
      `<h3>Skills</h3><p>${skills.technical.map(escape).join(', ')}</p><p>${skills.researchAndAnalysis.map(escape).join(', ')}</p>`,
    ].join(''),
  research: () => research.map(card).join(''),
  experience: () => experience.map(card).join(''),
  work: () => work.map(card).join(''),
  creative: () => creative.map(card).join(''),
  art: () =>
    realImages(art.images)
      .map((image) => `<figure><img src="${escape(image.src)}" alt="${escape(image.alt)}" loading="lazy" />${image.title ? `<figcaption>${escape(image.title)}</figcaption>` : ''}</figure>`)
      .join('') + `<p><a href="${escape(art.instagram.href)}">${escape(art.instagram.label)}</a></p>`,
  cats: () =>
    realImages(cats.images)
      .map((image) => `<figure><img src="${escape(image.src)}" alt="${escape(image.alt)}" loading="lazy" />${image.caption ? `<figcaption>${escape(image.caption)}</figcaption>` : ''}</figure>`)
      .join(''),
  interests: () => `<ul>${interests.map((i) => `<li>${escape(i)}</li>`).join('')}</ul>`,
  contact: () =>
    [
      `<p><a href="mailto:${escape(contact.email)}">${escape(contact.email)}</a></p>`,
      `<ul>${contact.links.map((l) => `<li><a href="${escape(l.href)}">${escape(l.label)}</a></li>`).join('')}</ul>`,
      `<p>${escape(contact.location)}</p>`,
      `<p><a href="${escape(resume.href)}" download="${escape(resume.filename)}">Download résumé (PDF)</a></p>`,
    ].join(''),
}

export function renderPlainHtml() {
  const body = sections
    .map(({ id, title, intro }) => {
      const content = BODIES[id]()
      // a section with nothing real in it yet, like a gallery of placeholders, is left out
      if (!content && !intro) return ''
      return `<section id="${id}"><h2>${escape(title)}</h2>${intro ? `<p>${escape(intro)}</p>` : ''}${content}</section>`
    })
    .join('')
  return `<main id="plain" class="plain"><header><h1>${escape(site.name)}</h1><p>${escape(site.summary)}</p><p><a class="plain-back" href="/">Step into the 3D café</a></p></header>${body}</main>`
}

export function renderJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    description: site.summary,
    alumniOf: about.education.title,
    sameAs: contact.links.map((l) => l.href),
  }).replace(/</g, '\\u003c')
}
