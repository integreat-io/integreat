import { isTypedData } from '../utils/is'

const removeTypePrefixOnId = (item: unknown) => {
  if (isTypedData(item)) {
    const { id, $type: type } = item

    if (id && id.startsWith(`${type}:`)) {
      const transId = id.substr(type.length + 1)
      item = Object.assign({}, item, { id: transId })
    }
  }

  return item
}

const removeTypePrefixOnIdRev = (item: unknown) => {
  if (isTypedData(item)) {
    const { id, $type: type } = item

    if (id && !id.startsWith(`${type}:`)) {
      const transId = `${type}:${id}`
      item = Object.assign({}, item, { id: transId })
    }
  }

  return item
}

export default Object.assign(removeTypePrefixOnId, {
  rev: removeTypePrefixOnIdRev,
})
