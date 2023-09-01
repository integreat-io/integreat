import rfdc from 'rfdc'
import { deepmergeCustom } from 'deepmerge-ts'

const mergeOptions = {
  mergeArrays: false as const,
}

export const deepClone = rfdc()

export const deepMerge = deepmergeCustom(mergeOptions)

export function deepMergeItems(a: unknown, b: unknown) {
  if (Array.isArray(a) && Array.isArray(b)) {
    // eslint-disable-next-line security/detect-object-injection
    return a.map((item, index) => deepMerge(item, b[index]))
  } else if (!Array.isArray(a) && !Array.isArray(b)) {
    return deepMerge(a, b)
  } else {
    throw new Error('Cannot merge array with non-array')
  }
}
