import mapAny = require('map-any')
import { GenericData, Data, Reference } from '../../types'
import { isDataObject, isCastedData, isReference } from '../../utils/is'

interface Operands {
  type: string
}

interface Context {
  rev?: boolean
}

const extractId = (value: GenericData) =>
  isDataObject(value)
    ? value.id
    : value instanceof Date
    ? value.getTime()
    : value

const isRev = (context: Context) =>
  typeof context === 'object' && context !== null && context.rev === true

const castItem = (type: string, context: Context) => (
  value: GenericData
): Data | Reference | string | null | undefined => {
  if (isCastedData(value)) {
    return value.$type === type ? value : undefined
  } else if (isReference(value) && value.$ref !== type) {
    return undefined
  }

  const id = extractId(value)
  if (typeof id === 'string' || (typeof id === 'number' && !isNaN(id))) {
    return isRev(context)
      ? String(id)
      : {
          id: String(id),
          $ref: type
        }
  } else if (id === null) {
    return null
  } else {
    return undefined
  }
}

export default function reference({ type }: Operands) {
  return (value: GenericData, context: Context) =>
    mapAny(castItem(type, context), value)
}
