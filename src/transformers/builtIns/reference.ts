import mapAny = require('map-any')
import { CustomFunction } from 'map-transform'
import { isDataObject, isTypedData, isReference, isDate } from '../../utils/is'
import { Data } from '../../types'

interface Operands extends Record<string, unknown> {
  type?: string
}

function extractId(value: Data) {
  if (isDataObject(value)) {
    return value.id
  } else {
    return isDate(value) ? value.getTime() : value
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

const reference: CustomFunction =
  ({ type }: Operands) =>
  (value, _context) =>
    mapAny(castItem(type), value)

export default reference
