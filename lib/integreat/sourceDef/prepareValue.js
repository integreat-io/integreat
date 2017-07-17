const prepareFormat = (format, formatters) => {
  if (!Array.isArray(format)) {
    return null
  }

  const stripArr = (trans) => (trans.endsWith('[]')) ? trans.substr(0, trans.length - 2) : trans
  const mapTrans = (trans) => (typeof trans === 'string' && formatters) ? formatters[stripArr(trans)] : trans
  const transOnly = (trans) => trans && ['function', 'object'].includes(typeof trans)

  return format.map(mapTrans).filter(transOnly)
}

/**
 * Prepare the value definition format for attr or rel creation.
 * @param {Object} def - Value definition object
 * @param {Object} resources - Object with formatters and isRel
 * @returns {Object} An object groomed and ready for the valueMapper function
 */
function prepareValue (def, {formatters, isRel = false} = {}) {
  const {
    key,
    type = (isRel) ? key : (/(cre|upd)atedAt/.test(key)) ? 'date' : 'string',
    path = null,
    default: defaultValue
  } = def || {}

  const formatDef = (def) ? [].concat(def.format, (isRel) ? null : type) : null
  const format = prepareFormat(formatDef, formatters)

  return {
    key,
    type,
    path,
    default: defaultValue,
    format
  }
}

module.exports = prepareValue
