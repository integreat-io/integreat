import { CustomFunction } from 'map-transform'
import { isObject } from '../utils/is'

const isParsed = (data: unknown) => Array.isArray(data) || isObject(data)

function parse(data: unknown) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {}
  } else if (isParsed(data)) {
    return data
  }
  return undefined
}

function stringify(data: unknown) {
  return JSON.stringify(data)
}

const json: CustomFunction = (_operands, _options) => (data, context) =>
  context.rev ? stringify(data) : parse(data)

export default json
