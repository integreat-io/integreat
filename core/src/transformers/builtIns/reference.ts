import mapAny = require('map-any')
import { Data } from '../../types'
import { isDataObject, isTypedData, isReference } from '../../utils/is'

interface Operands extends Record<string, unknown> {
  type?: string
}

function extractId(value: Data) {
  if (isDataObject(value)) {
    return value.id
  } else {
    return value instanceof Date ? value.getTime() : value
  }
}

function extractProps(value: Data) {
  if (isDataObject(value)) {
    const { isNew, isDeleted } = value
    return {
      ...(isNew === true ? { isNew } : {}),
      ...(isDeleted === true ? { isDeleted } : {}),
    }
  }
  return {}
}

const castItem = (type: string | undefined) => (value: Data) => {
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
      $ref: type,
      ...extractProps(value),
    }
  } else if (id === null) {
    return null
  } else {
    return undefined
  }
}

export default function reference({ type }: Operands) {
  return (value: Data, _context: Record<string, unknown>): Data =>
    mapAny(castItem(type), value)
}
