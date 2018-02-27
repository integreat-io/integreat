const predicate = require('./predicate')

const flatten = (sup, sub) => sup.concat(sub)

const filter = ({path, operator, value}) => (object) => {
  const candidate = get(object, path)
  return predicate(value, operator, candidate)
}

const nextArray = (object, def) => {
  const value = (def.prop === null) ? object : object[def.prop]

  switch (def.type) {
    case 'keys':
      return Object.keys(value)
    case 'values':
      return Object.values(value)
  }

  if (!Array.isArray(value)) {
    return (value) ? [value] : []
  }

  switch (def.type) {
    case 'one':
      return value[(def.index < 0) ? value.length + def.index : def.index]
    case 'range':
      return value.slice(def.begin, def.end)
    case 'filter':
      return value.filter(filter(def))
  }
  return value
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

const getPath = (object, path, defaultValue) => {
  let ret = path.reduce(next, object)

  if (Array.isArray(ret)) {
    if (ret.length > 0) {
      return replaceUndefinedInArray(ret, defaultValue)
    }
  }

  return ret
}

/**
 * Get the value(s) at the given path from an object.
 * If a path does not match a property of the object, the path at the
 * `next` property of the first path will be tried, then the next, etc.,
 * untill a path matches or there are no more alternative paths, and the
 * `defaultValue` will be returned.
 * @param {Object} object - The object to travers
 * @param {Array} path - A compiled path
 * @returns {Object} The returned value
 */
function get (object, path, defaultValue) {
  if (!path) {
    return object
  }

  let ret = getPath(object, path, defaultValue)
  while (ret === undefined && path.next !== undefined) {
    path = path.next
    ret = getPath(object, path, defaultValue)
  }
  if (ret === undefined) {
    return defaultValue
  }

  return ret
}

module.exports = get
