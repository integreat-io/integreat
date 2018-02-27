const nextObject = (object, def, path, pathIndex, value) => {
  const propIsArray = typeof def !== 'string'

  if (path.length > pathIndex) {
    if (def.spread && Array.isArray(value)) {
      object = [].concat(object)
      value = value.reduce((arr, value, index) => [
        ...arr,
        next(object[index] || {}, path, pathIndex, value)
      ], [])
    } else {
      const nextObj = (object !== undefined && !propIsArray) ? object : {}
      value = next(nextObj, path, pathIndex, value)
    }
  }

  if (!propIsArray || Array.isArray(value)) {
    return value
  }

  object = (typeof object === 'undefined') ? [] : [].concat(object)
  const index = (def.index >= 0) ? def.index : (def.spread) ? object.length : 0
  object[index] = value
  return object
}

const next = (object, path, pathIndex, value) => {
  const def = path[pathIndex]
  const prop = (typeof def.prop === 'undefined') ? def : def.prop

  if (prop === null) {
    return nextObject(object, def, path, pathIndex + 1, value)
  }
  object[prop] = nextObject(object[prop], def, path, pathIndex + 1, value)
  return object
}

/**
 * Set the value(s) at the given path on an object.
 * @param {Object} object - The object to set on
 * @param {Array} path - A compiled path
 * @param {Object} value - An optional default value
 * @returns {Object} The object
 */
function set (object, path, value) {
  if (!Array.isArray(path) || path.length === 0) {
    return value
  }

  return next(object, path, 0, value)
}

module.exports = set
