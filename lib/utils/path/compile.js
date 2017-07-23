const setSpreadSub = (parts, index = 0, sub = false, spread = false) => {
  if (parts.length === index) {
    return spread
  }

  const part = parts[index]
  if (part.type) {
    if (sub) {
      part.sub = sub
    }
    sub = sub || (part.type !== 'one')
    spread = spread || !!part.spread
  }

  spread = setSpreadSub(parts, index + 1, sub, spread)

  if (!spread && part.type && part.type !== 'one') {
    spread = part.spread = true
  }
  return spread
}

const isAll = (filter) => (filter === '*' || filter === '')
const parseAll = (prop, filter) => Object.assign(
  {prop, type: 'all'},
  (filter === '*') ? {spread: true} : {}
)

const isFilter = (filter) => (filter.includes('='))
const parseFilter = (prop, filter) => {
  const [path, value] = filter.split('=')
  return {
    prop,
    type: 'filter',
    path: compile(path),
    value: JSON.parse(value)
  }
}

const isRange = (filter) => (filter.includes(':'))
const parseRange = (prop, filter) => {
  const results = /^(-?\d+)?:(-?\d+)?$/.exec(filter)
  if (results) {
    const begin = Number.parseInt(results[1])
    const end = Number.parseInt(results[2])
    return Object.assign(
      {prop, type: 'range'},
      (isNaN(begin)) ? {} : {begin},
      (isNaN(end)) ? {} : {end}
    )
  }
  throw new TypeError(`Invalid filter format in path. ${prop}[${filter}]`)
}

const parseOne = (prop, filter) => {
  const index = Number.parseInt(filter)
  if (!isNaN(index)) {
    return {prop, type: 'one', index}
  }
  throw new TypeError(`Invalid filter format in path. ${prop}[${filter}]`)
}

const arrayPart = (prop, filter) => {
  if (isAll(filter)) {
    return parseAll(prop, filter)
  }
  if (isFilter(filter)) {
    return parseFilter(prop, filter)
  }
  if (isRange(filter)) {
    return parseRange(prop, filter)
  }
  return parseOne(prop, filter)
}

const split = (path) => {
  const regex = /(\\?[.[\]])/g
  const parts = []
  let part = []

  const pushToParts = () => {
    const joined = part.join('')
    if (joined !== '') {
      parts.push(joined)
    }
    part = []
  }

  let results
  let start = 0
  let brackets = 0

  while ((results = regex.exec(path)) !== null) {
    const match = results[1]
    part.push(path.substring(start, results.index))
    start = regex.lastIndex

    if (match.substr(0, 1) === '\\') {
      part.push(match.substr(1))
    } else if ((match === '.' && brackets === 0) || (match === '[' && brackets++ === 0)) {
      pushToParts()
    } else if (match === ']' && --brackets === 0) {
      parts[parts.length - 1] = arrayPart(parts[parts.length - 1], part.join(''))
      part = []
    } else {
      part.push(match)
    }
  }

  part.push(path.substr(start))
  pushToParts()

  return parts
}

/**
 * Compiles a path string into an array of segments.
 * @param {string} path - The path to compile
 * @returns {array} Compiled path
 */
function compile (path) {
  if (!path) {
    return []
  }

  const parts = split(path)
  setSpreadSub(parts)
  return parts
}

module.exports = compile
