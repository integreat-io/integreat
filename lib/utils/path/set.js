const next = (object, def, path, value) => {
  const propIsArray = typeof def !== 'string'

  if (path.length > 0) {
    if (def.spread && Array.isArray(value)) {
      object = [].concat(object)
      value = value.reduce((arr, value, index) => [...arr, set(object[index] || {}, path, value)], [])
    } else {
      const nextObj = (object !== undefined && !propIsArray) ? object : {}
      value = set(nextObj, path, value)
    }
  }

  if (!propIsArray || Array.isArray(value)) {
    return value
  }

  object = [].concat(object)
  object[(def.index >= 0) ? def.index : 0] = value
  return object
}

/**
 * Set the value(s) at the given path on an object.
 * @param {Object} object - The object to set on
 * @param {Array} path - A compiled path
 * @returns {Object} The object
 */
function set (object, path, value) {
  if (!Array.isArray(path) || path.length === 0) {
    return value
  }

  const def = path[0]
  const prop = def.prop || def

  object[prop] = next(object[prop], def, path.slice(1), value)
  return object
}

module.exports = set
