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

export function lookupById<T extends unknown>(
  id: string,
  resource?: Record<string, T>
): T | undefined {
  // eslint-disable-next-line security/detect-object-injection
  return typeof id === 'string' && resource ? resource[id] : undefined
}
