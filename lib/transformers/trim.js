function trim (value) {
  return (typeof value === 'string') ? value.trim() : value
}

module.exports = Object.assign(
  trim,
  { rev: trim }
)
