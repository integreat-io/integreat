import { Transformer } from 'map-transform'
import { isObject } from '../utils/is.js'

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

const json: Transformer = (_operands, _options) => (data, state) =>
  state.rev ? stringify(data) : parse(data)

export default json
