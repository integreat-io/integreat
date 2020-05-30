import { Dictionary } from '../types'

export interface ObjectWithId {
  id: string
}

export function indexById<T extends ObjectWithId>(
  obj: Dictionary<T>,
  item: T
): Dictionary<T> {
  return {
    ...obj,
    [item.id]: item
  }
}

export function lookupById<T extends unknown>(
  id: string | unknown,
  resource?: Dictionary<T>
): T | undefined {
  // eslint-disable-next-line security/detect-object-injection
  return typeof id === 'string' && resource ? resource[id] : undefined
}
