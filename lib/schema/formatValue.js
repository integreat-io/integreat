const formatInt = (value) => {
  const int = Number.parseInt(value, 10)
  return (isNaN(int)) ? undefined : int
}

const formatFloat = (value) => {
  const float = Number.parseFloat(value)
  return (isNaN(float)) ? undefined : float
}

const formatDate = (value) => {
  const date = (value !== null) ? new Date(value) : null
  return (!date || isNaN(date.getTime())) ? undefined : date
}

const formatBoolean = (value) =>
  (value === 'false') ? false : !!value

const formatString = (value) => (value) ? value.toString() : undefined

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
