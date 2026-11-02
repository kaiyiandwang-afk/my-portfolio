import { interests } from '../../content'
import { useCafe } from '../../state/store'
import { goToSection } from '../ExploreMenu'

/** Choosing one heads to the telephone with that topic ready to ask about. */
export function askAbout(interest: string) {
  useCafe.setState({ askAbout: interest.replace(/\s*\p{Extended_Pictographic}/gu, '') })
  goToSection('contact')
}

/** The phone's version of the pills that rise from the hotpot. */
export function InterestList() {
  return (
    <div className="ladle">
      {interests.map((interest, i) => (
        <button key={interest} type="button" style={{ '--n': i } as React.CSSProperties} onClick={() => askAbout(interest)}>
          {interest}
          <small>Ask me →</small>
        </button>
      ))}
    </div>
  )
}
