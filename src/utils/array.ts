export function ensureArray<T = unknown>(value: T | T[]): NonNullable<T>[] {
  return ([] as T[])
    .concat(value)
    .filter(
      (item: T): item is NonNullable<T> => item !== undefined && item !== null
    )
}

export function arrayIncludes<T = unknown>(a: T | T[], b: T | T[]): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.some((item) => b.includes(item))
  } else if (Array.isArray(a)) {
    return a.includes(b as T)
  } else if (Array.isArray(b)) {
    return b.includes(a)
  } else {
    return a === b
  }
}
