function uppercase (value) {
  if (typeof value === 'string') {
    return value.toLowerCase()
  }
  return value
}

export default Object.assign(
  uppercase,
  { rev: uppercase }
)
