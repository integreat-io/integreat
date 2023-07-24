import { isTypedData, isReference, isDate, isObject } from '../../utils/is.js'
import type { CastFns } from '../types.js'

function extractId(value: unknown) {
  if (isObject(value)) {
    return value.id
  } else {
    return isDate(value) ? value.getTime() : value
  }
}

function extractProps(value: unknown) {
  if (isObject(value)) {
    const { isNew, isDeleted } = value
    return {
      ...(isNew === true ? { isNew } : {}),
      ...(isDeleted === true ? { isDeleted } : {}),
    }
  }
  return {}
}

const refKeys = ['id', '$ref', 'isNew', 'isDeleted']

const hasMoreProps = (value: unknown): value is Record<string, unknown> => {
  if (!isObject(value)) {
    return false
  }
  const keys = Object.keys(value).filter((key) => !refKeys.includes(key))
  return keys.length > 0
}

export default function castNonPrimitive(type: string, castFns: CastFns) {
  return (value: unknown, isRev = false) => {
    // Return undefined when this is a reference with other type than ours
    if (isReference(value) && value.$ref !== type) {
      return undefined
    }

    // Cast as object if we have more props than expected for a reference.
    // Return undefined if this is already typed data with other type than ours.
    if (isTypedData(value) || hasMoreProps(value)) {
      if (typeof value.$type === 'string' && value.$type !== type) {
        return undefined
      } else {
        const cast = castFns.get(type)
        return typeof cast === 'function' ? cast(value, isRev) : value
      }
    }

    // Cast as reference
    const id = extractId(value)
    if (typeof id === 'string' || (typeof id === 'number' && !isNaN(id))) {
      return {
        id: String(id),
        ...(isRev ? {} : { $ref: type }),
        ...extractProps(value),
      }
    } else if (id === null) {
      return null
    } else {
      return undefined
    }
  }
}
