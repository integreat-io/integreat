function uppercase (value) {
  if (typeof value === 'string') {
    return value.toLowerCase()
  }
  return value
}

module.exports = Object.assign(
  uppercase,
  { rev: uppercase }
)
