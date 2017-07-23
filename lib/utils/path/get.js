const filter = ({path, value}) => (item) => {
  const candidate = get(item, path)
  return (Array.isArray(candidate))
    ? candidate.includes(value)
    : candidate === value
}

const flatten = (sup, sub) => sup.concat(sub)

const nextArray = (object, def) => {
  const array = object[def.prop]

  if (!Array.isArray(array)) {
    return undefined
  }

  switch (def.type) {
    case 'one':
      return array[(def.index < 0) ? array.length + def.index : def.index]
    case 'range':
      return array.slice(def.begin, def.end)
    case 'filter':
      return array.filter(filter(def))
  }
  return array
}

const next = (object, prop) => {
  if (!object) {
    return object
  }

  if (typeof prop === 'string') {
    if (Array.isArray(object)) {
      return object.map((item) => next(item, prop))
    }
    return object[prop]
  }

  if (prop.sub) {
    return object.map((item) => nextArray(item, prop)).reduce(flatten, [])
  }
  return nextArray(object, prop)
}

const replaceUndefinedInArray = (array, defaultValue) => {
  if (defaultValue !== undefined) {
    return array.map((item) => (item === undefined) ? defaultValue : item)
  } else {
    array = array.filter((item) => item !== undefined)
    if (array.length === 0) {
      return undefined
    }
  }
  return array
}

/**
 * Get the value(s) at the given path from an object.
 * @param {Object} object - The object to travers
 * @param {Array} path - A compiled path
 * @returns {Object} The returned value
 */
function get (object, path, defaultValue) {
  if (!Array.isArray(path) || path.length === 0) {
    return object
  }

  let ret = path.reduce(next, object)

  if (Array.isArray(ret)) {
    if (ret.length > 0) {
      return replaceUndefinedInArray(ret, defaultValue)
    }
  } else if (ret === undefined) {
    return defaultValue
  }

  return ret
}

module.exports = get
