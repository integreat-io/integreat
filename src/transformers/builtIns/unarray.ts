import { CustomFunction } from 'map-transform'

const unarray: CustomFunction = (_operands) =>
  function unarray(value: unknown) {
    return Array.isArray(value)
      ? value.length === 1
        ? value[0]
        : undefined
      : value
  }

export default unarray
