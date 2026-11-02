import { projects, skills } from '../content'
import type { SectionId } from '../content'
import { ArtGallery } from './sections/Art'
import { Polaroids } from './sections/Cats'
import { Contact } from './sections/Contact'
import { Creative } from './sections/Creative'
import { Experience } from './sections/Experience'
import { InterestList } from './sections/Interests'
import { Research } from './sections/Research'
import { FoldCard, trackSpot } from './sections/shared'
import { Work } from './sections/Work'

/** The list of skills, shared by the laptop's Résumé window and the phone's Projects sheet. */
export function SkillsList() {
  return (
    <>
      <h4>Technical</h4>
      <div className="pills">
        {skills.technical.map((skill) => (
          <span className="pill" key={skill}>
            {skill}
          </span>
        ))}
      </div>
      <h4>Research &amp; analysis</h4>
      <div className="pills">
        {skills.researchAndAnalysis.map((skill) => (
          <span className="pill" key={skill}>
            {skill}
          </span>
        ))}
      </div>
    </>
  )
}

/** What each section shows in the drawer. Kaiyi's About lives in her conversation bubble instead. */
export function SectionBody({ id }: { id: SectionId }) {
  switch (id) {
    case 'projects':
      // Larger screens see these as windows on the laptop; this is the phone's version.
      return (
        <>
          {projects.map((card, i) => (
            <FoldCard key={card.title} card={card} startOpen={i === 0} />
          ))}
          <article className="card spot" onPointerMove={trackSpot}>
            <h3>Skills</h3>
            <SkillsList />
          </article>
        </>
      )
    case 'research':
      return <Research />
    case 'experience':
      return <Experience />
    case 'work':
      return <Work />
    case 'creative':
      return <Creative />
    case 'art':
      return <ArtGallery />
    case 'cats':
      return <Polaroids />
    case 'interests':
      return <InterestList />
    case 'contact':
      return <Contact />
    case 'about':
      return null
  }
}
