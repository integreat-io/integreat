function trim(value: unknown) {
  return typeof value === 'string' ? value.trim() : value
}

export default Object.assign(trim, { rev: trim })
