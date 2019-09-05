import mapAny = require('map-any')
import { Data } from '../../types'
import { isDataObject, isTypedData, isReference } from '../../utils/is'

interface Operands {
  type?: string
}

interface Context {
  rev?: boolean
}

const extractId = (value: Data) =>
  isDataObject(value)
    ? value.id
    : value instanceof Date
    ? value.getTime()
    : value

const isRev = (context: Context) =>
  typeof context === 'object' && context !== null && context.rev === true

const castItem = (type: string | undefined, context: Context) => (
  value: Data
) => {
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
  return (value: Data, context: Context): Data =>
    mapAny(castItem(type, context), value)
}
