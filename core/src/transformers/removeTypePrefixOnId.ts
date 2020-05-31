import { CustomFunction } from 'map-transform'
import { isTypedData } from '../utils/is'
import { Data } from '../types'

const removeTypePrefixOnIdFwd = (item: Data) => {
  if (isTypedData(item)) {
    const { id, $type: type } = item

    if (id && id.startsWith(`${type}:`)) {
      const transId = id.substr(type.length + 1)
      item = Object.assign({}, item, { id: transId })
    }
  }

  return item
}

const removeTypePrefixOnIdRev = (item: Data) => {
  if (isTypedData(item)) {
    const { id, $type: type } = item

    if (id && !id.startsWith(`${type}:`)) {
      const transId = `${type}:${id}`
      item = Object.assign({}, item, { id: transId })
    }
  }

  return item
}

const removeTypePrefixOnId: CustomFunction = (_operands, _options) => (
  value,
  context
) =>
  context.rev ? removeTypePrefixOnIdRev(value) : removeTypePrefixOnIdFwd(value)

export default removeTypePrefixOnId
