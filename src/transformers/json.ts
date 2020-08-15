import { CustomFunction } from 'map-transform'

function parse(data: unknown) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {}
  }
  return undefined
}

function stringify(data: unknown) {
  return JSON.stringify(data)
}

const json: CustomFunction = (_operands, _options) => (data, context) =>
  context.rev ? stringify(data) : parse(data)

export default json
