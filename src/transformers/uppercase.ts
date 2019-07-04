function uppercase (value) {
  if (typeof value === 'string') {
    return value.toUpperCase()
  }
  return value
}

export default Object.assign(
  uppercase,
  { rev: uppercase }
)
