const isTrue = (value, operator) => (candidate) => {
  switch (operator) {
    case '=':
      return candidate === value
    case '^=':
      return typeof candidate === 'string' && candidate.startsWith(value)
    case '$=':
      return typeof candidate === 'string' && candidate.endsWith(value)
  }
  return false
}

function predicate (value, operator, candidate) {
  return (Array.isArray(candidate))
    ? candidate.some(isTrue(value, operator))
    : isTrue(value, operator)(candidate)
}

module.exports = predicate
