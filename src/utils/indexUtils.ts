import { isNotNullOrUndefined } from './is.js'

export interface ObjectWithId {
  id: string
}

export function indexById<T extends ObjectWithId>(
  obj: Record<string, T>,
  item: T
): Record<string, T> {
  return {
    ...obj,
    [item.id]: item,
  }
}

export function lookupById<T>(
  id: string | T,
  resources?: Record<string, T>
): T | undefined {
  // eslint-disable-next-line security/detect-object-injection
  return typeof id === 'string' ? resources && resources[id] : id
}

export function lookupByIds<T>(
  ids: (string | T)[] = [],
  resources?: Record<string, T>
): T[] {
  return ids.map((id) => lookupById(id, resources)).filter(isNotNullOrUndefined)
}
