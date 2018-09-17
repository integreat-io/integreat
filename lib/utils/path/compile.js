const shouldSetSpread = (segment, spread) =>
  !spread && segment.type && !['one', 'keys', 'values'].includes(segment.type)

const nextSub = (sub, segment) => (!segment.type || sub) ? sub : segment.type !== 'one'
const nextSpread = (spread, segment) => (!segment.type || spread) ? spread : !!segment.spread

const setSpreadSub = (segments, index = 0, sub = false, spread = false) => {
  const segment = segments[index]

  if (segment) {
    segment.sub = sub

    spread = setSpreadSub(
      segments,
      index + 1,
      nextSub(sub, segment),
      nextSpread(spread, segment)
    )

    if (shouldSetSpread(segment, spread)) {
      spread = segment.spread = true
    }
  }

  return spread
}

const isAll = (filter) => (filter === '*' || filter === '')
const parseAll = (prop, filter) => Object.assign(
  { prop, type: 'all' },
  (filter === '*') ? { spread: true } : {}
)

const isFilter = (filter) => (filter && filter.includes('='))
const parseFilter = (prop, filter) => {
  const [, path, operator, value] = filter.match(/^([^$^=]*)([$^]?=)(.+)$/)
  return {
    prop,
    type: 'filter',
    path: compile(path),
    operator,
    value: JSON.parse(value)
  }
}

const isRange = (filter) => (filter && filter.includes(':'))
const parseRange = (prop, filter) => {
  const results = /^(-?\d+)?:(-?\d+)?$/.exec(filter)
  if (results) {
    const begin = Number.parseInt(results[1])
    const end = Number.parseInt(results[2])
    return Object.assign(
      { prop, type: 'range' },
      (isNaN(begin)) ? {} : { begin },
      (isNaN(end)) ? {} : { end }
    )
  }
  throw new TypeError(`Invalid filter format in path. ${prop}[${filter}]`)
}

const isSpecials = (filter) => (['keys', 'values'].includes(filter))
const parseSpecials = (prop, filter) => {
  return { prop, type: filter }
}

const parseOne = (prop, filter) => {
  const index = Number.parseInt(filter)
  if (!isNaN(index)) {
    return { prop, type: 'one', index }
  }
  throw new TypeError(`Invalid filter format in path. ${prop}[${filter}]`)
}

const arraySegment = (prop, filter) => {
  let value
  if (isAll(filter)) {
    value = parseAll(prop, filter)
  } else if (isFilter(filter)) {
    value = parseFilter(prop, filter)
  } else if (isRange(filter)) {
    value = parseRange(prop, filter)
  } else if (isSpecials(filter)) {
    value = parseSpecials(prop, filter)
  } else {
    value = parseOne(prop, filter)
  }
  return value
}

const pushToSegments = (segment, segments) => {
  const joined = segment.join('')
  if (joined !== '') {
    segments.push(joined)
  }
  segment.length = 0
}

const pushBracketToSegments = (segment, segments) => {
  if (segments.length === 0) {
    segments.push(arraySegment(null, segment.join('')))
  } else {
    segments[segments.length - 1] = arraySegment(segments[segments.length - 1], segment.join(''))
  }
  segment.length = 0
}

const nextBracketLevel = (bracketLevel, match) =>
  (match === '[') ? bracketLevel + 1
    : (match === ']') ? bracketLevel - 1
      : bracketLevel

const isDotOrStartBracket = (match, bracketLevel) =>
  ((match === '.' && bracketLevel === 0) || (match === '[' && bracketLevel === 0))

const isEndBracket = (match, bracketLevel) =>
  (match === ']' && bracketLevel === 1)

const processMatch = (match, segment, segments, bracketLevel) => {
  if (isDotOrStartBracket(match, bracketLevel)) {
    pushToSegments(segment, segments)
  } else if (isEndBracket(match, bracketLevel)) {
    pushBracketToSegments(segment, segments)
  } else {
    segment.push((match[0] === '\\') ? match.substr(1) : match)
  }
  return nextBracketLevel(bracketLevel, match)
}

const splitSegments = (path, segment, segments, start, bracketLevel, regex) => {
  const results = regex.exec(path)

  if (results === null) {
    return start
  } else {
    const match = results[1]
    segment.push(path.substring(start, results.index))

    bracketLevel = processMatch(match, segment, segments, bracketLevel)

    return splitSegments(path, segment, segments, regex.lastIndex, bracketLevel, regex)
  }
}

const split = (path) => {
  const regex = /(\\?[.[\]])/g
  const segments = []
  const segment = []

  const start = splitSegments(path, segment, segments, 0, 0, regex)

  segment.push(path.substr(start))
  pushToSegments(segment, segments)

  return segments
}

const isPredicate = (segments) => {
  const last = segments[segments.length - 1]
  return isFilter((typeof last === 'string') ? last : last.prop)
}
const parsePredicate = (segments) => {
  const last = segments.pop()
  const { path, operator, value } = parseFilter('', last)
  if (path !== null) {
    segments = segments.concat(path)
  }
  return { path: segments, operator, value }
}

const compilePath = (path) => {
  const segments = split(path)
  setSpreadSub(segments)
  if (isPredicate(segments)) {
    return parsePredicate(segments)
  }
  return segments
}

/**
 * Compiles a path string into an array of segments.
 * If the path is an array of strings, they are treated as a chain of paths,
 * and as alternatives for `get()`, while `compare()` will requeire all of them
 * to return true. The first will be returned with the next as a `next`
 * property, etc.
 * @param {string|string[]} path - The path to compile
 * @returns {array} Compiled path
 */
function compile (path) {
  if (!path) {
    return null
  }

  if (Array.isArray(path)) {
    const base = {}
    path.reduce((prev, path) => {
      prev.next = compilePath(path)
      return prev.next
    }, base)
    return base.next
  } else {
    return compilePath(path)
  }
}

module.exports = compile
