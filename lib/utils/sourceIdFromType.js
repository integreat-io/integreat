function sourceIdFromType (type, types) {
  types = types || {}
  return (types[type] || {}).source || null
}

module.exports = sourceIdFromType
