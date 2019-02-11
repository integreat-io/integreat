const formatInt = (value) => {
  if (value === null) {
    return null
  }
  const int = Number.parseInt(value, 10)
  return (isNaN(int)) ? undefined : int
}

const formatFloat = (value) => {
  if (value === null) {
    return null
  }
  const float = Number.parseFloat(value)
  return (isNaN(float)) ? undefined : float
}

const formatDate = (value) => {
  if (value === null) {
    return null
  }
  const date = new Date(value)
  return (!date || isNaN(date.getTime())) ? undefined : date
}

const formatBoolean = (value) => {
  if (value === null) {
    return null
  }
  return (value === 'false') ? false : !!value
}

const formatString = (value) => (value === null || typeof value === 'undefined')
  ? value
  : String(value)

const formatOneValue = (value, { type }) => {
  switch (type) {
    case 'integer':
      return formatInt(value)
    case 'float':
      return formatFloat(value)
    case 'date':
      return formatDate(value)
    case 'boolean':
      return formatBoolean(value)
  }
  // Default 'string'
  return formatString(value)
}

const formatValue = (value, { type }) => {
  return (Array.isArray(value))
    ? value.map((val) => formatOneValue(val, { type }))
    : formatOneValue(value, { type })
}

module.exports = formatValue
