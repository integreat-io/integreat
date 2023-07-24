export default function castBoolean(value: unknown) {
  if (value === null || value === undefined) {
    return value
  } else {
    return value === 'false' ? false : Boolean(value)
  }
}
