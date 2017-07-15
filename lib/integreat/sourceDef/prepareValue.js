const prepareTransform = (transform, transforms) => {
  if (!Array.isArray(transform)) {
    return null
  }

  const stripArr = (trans) => (trans.endsWith('[]')) ? trans.substr(0, trans.length - 2) : trans
  const mapTrans = (trans) => (typeof trans === 'string' && transforms) ? transforms[stripArr(trans)] : trans
  const transOnly = (trans) => trans && ['function', 'object'].includes(typeof trans)

  return transform.map(mapTrans).filter(transOnly)
}

/**
 * Prepare the value definition format for attr or rel creation.
 * @param {Object} def - Value definition object
 * @param {Object} resources - Object with transforms and isRel
 * @returns {Object} An object groomed and ready for the valueMapper function
 */
function prepareValue (def, {transforms, isRel = false} = {}) {
  const {
    key,
    type = (isRel) ? key : (/(cre|upd)atedAt/.test(key)) ? 'date' : 'string',
    path = null,
    default: defaultValue
  } = def || {}

  const transformDef = (def) ? [].concat(def.transform, (isRel) ? null : type) : null
  const transform = prepareTransform(transformDef, transforms)

  return {
    key,
    type,
    path,
    default: defaultValue,
    transform
  }
}

module.exports = prepareValue
