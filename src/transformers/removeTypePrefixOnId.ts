const removeTypePrefixOnId = (item) => {
  const { id, type } = item

  if (id.startsWith(`${type}:`)) {
    const transId = id.substr(type.length + 1)
    item = Object.assign({}, item, { id: transId })
  }

  return item
}

const removeTypePrefixOnIdRev = (item) => {
  const { id, type } = item

  if (!id.startsWith(`${type}:`)) {
    const transId = `${type}:${id}`
    item = Object.assign({}, item, { id: transId })
  }

  return item
}

module.exports = Object.assign(
  removeTypePrefixOnId,
  { rev: removeTypePrefixOnIdRev }
)
