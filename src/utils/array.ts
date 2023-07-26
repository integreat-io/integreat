export function ensureArray<T = unknown>(value: T | T[]): NonNullable<T>[] {
  return ([] as T[])
    .concat(value)
    .filter(
      (item: T): item is NonNullable<T> => item !== undefined && item !== null
    )
}

export function ensureArrayOrUndefined<T = unknown>(
  value: T | T[]
): NonNullable<T>[] | undefined {
  return value === undefined ? undefined : ensureArray(value)
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

export const getFirstIfArray = <T>(data: T | T[]): T =>
  Array.isArray(data) ? data[0] : data

export async function filterAsync<T>(
  arr: T[],
  comparer: (value: T) => Promise<boolean>
) {
  const results = await Promise.all(arr.map(async (val) => await comparer(val)))
  return arr.filter((_v, index) => results[index]) // eslint-disable-line security/detect-object-injection
}
