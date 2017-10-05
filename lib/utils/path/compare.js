const get = require('./get')
const predicate = require('./predicate')

const compareDef = (object, def) => {
  if (Array.isArray(def)) {
    if (def.length === 0) {
      return true
    } else {
      // def is a path - return true if it exists
      return !!get(object, def)
    }
  } else {
    const {path, operator, value} = def
    const candidate = get(object, path)
    return predicate(value, operator, candidate)
  }
}

function compare (object, def) {
  let ret = true

  if (def) {
    do {
      ret = compareDef(object, def)
      def = def.next
    } while (ret === true && def !== undefined)
  }

  return ret
}

module.exports = compare
