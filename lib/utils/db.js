module.exports = {
  toDb (item) {
    if (!item) {
      return null
    }

    return Object.assign({}, item, {
      id: `${item.type}:${item.id}`,
      type: 'item',
      itemtype: item.type
    })
  },

  fromDb (item) {
    if (!item) {
      return null
    }

    const ret = Object.assign({}, item)
    ret.id = item.id.substr(item.itemtype.length + 1)
    ret.type = item.itemtype
    delete ret.itemtype
    return ret
  }
}
