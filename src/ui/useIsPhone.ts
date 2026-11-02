import { useEffect, useState } from 'react'
import { PHONE_WIDTH, isPhone } from '../state/panels'

export function useIsPhone() {
  const [phone, setPhone] = useState(isPhone)
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${PHONE_WIDTH - 1}px)`)
    const update = () => setPhone(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return phone
}
