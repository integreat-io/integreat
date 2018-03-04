const isSimpleSegment = (def) => typeof def === 'string'

const nextObject = (object, def) => (object !== undefined && isSimpleSegment(def)) ? object : {}

const processNextValue = (object, value, def, path, pathIndex) => {
  if (def.spread && Array.isArray(value)) {
    object = [].concat(object)
    return value.map((value, index) =>
      next(object[index], path, pathIndex, value))
  } else {
    return next(nextObject(object, def), path, pathIndex, value)
  }
}

const setValueOnArray = (object = [], value, def) => {
  object = [].concat(object)
  const index = (def.index >= 0) ? def.index : (def.spread) ? object.length : 0
  object[index] = value
  return object
}

const processObject = (object, value, def, path, pathIndex) => {
  if (path.length > pathIndex) {
    value = processNextValue(object, value, def, path, pathIndex)
  }

  if (isSimpleSegment(def) || Array.isArray(value)) {
    return value
  }

  return setValueOnArray(object, value, def)
}

const next = (object = {}, path, pathIndex, value) => {
  const def = path[pathIndex]
  const prop = (typeof def.prop === 'undefined') ? def : def.prop

  if (prop === null) {
    return processObject(object, value, def, path, pathIndex + 1)
  }
  object[prop] = processObject(object[prop], value, def, path, pathIndex + 1)
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
  if (!object) {
    return value
  }
  if (!Array.isArray(path) || path.length === 0) {
    return value
  }

  return next(object, path, 0, value)
}

module.exports = set
