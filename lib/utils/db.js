const _toDb = (item) =>
  Object.assign({}, item, {
    id: `${item.type}:${item.id}`,
    type: 'item',
    itemtype: item.type
  })

const _fromDb = (item) => {
  const ret = Object.assign({}, item)
  ret.id = item.id.substr(item.itemtype.length + 1)
  ret.type = item.itemtype
  delete ret.itemtype
  return ret
}

module.exports = {
  toDb (item) {
    if (!item) {
      return null
    }

    return (Array.isArray(item)) ? item.map(_toDb) : _toDb(item)
  },

  fromDb (item) {
    if (!item) {
      return null
    }

    return (Array.isArray(item)) ? item.map(_fromDb) : _fromDb(item)
  }
}
