function uppercase (value) {
  if (typeof value === 'string') {
    return value.toUpperCase()
  }
  return value
}

module.exports = Object.assign(
  uppercase,
  { rev: uppercase }
)
