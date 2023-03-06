import mapAny = require('map-any')
import type { Transformer } from 'map-transform/types.js'
import {
  isDataObject,
  isTypedData,
  isReference,
  isDate,
} from '../../utils/is.js'

interface Operands extends Record<string, unknown> {
  type?: string
}

function extractId(value: unknown) {
  if (isDataObject(value)) {
    return value.id
  } else {
    return isDate(value) ? value.getTime() : value
  }
}

function extractProps(value: unknown) {
  if (isDataObject(value)) {
    const { isNew, isDeleted } = value
    return {
      ...(isNew === true ? { isNew } : {}),
      ...(isDeleted === true ? { isDeleted } : {}),
    }
  }
  return {}
}

const castItem =
  (type: string | undefined, rev: boolean) => (value: unknown) => {
    if (type === undefined) {
      return undefined
    }
    if (isTypedData(value)) {
      return value.$type === type ? value : undefined
    } else if (isReference(value) && value.$ref !== type) {
      return undefined
    }

    const id = extractId(value)
    if (typeof id === 'string' || (typeof id === 'number' && !isNaN(id))) {
      return {
        id: String(id),
        ...(rev ? {} : { $ref: type }),
        ...extractProps(value),
      }
    } else if (id === null) {
      return null
    } else {
      return undefined
    }
  }

const reference: Transformer =
  ({ type }: Operands) =>
  (value, state) =>
    mapAny(castItem(type, !!state.rev), value)

export default reference
