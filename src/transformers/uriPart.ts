import mapAny = require('map-any')
import { CustomFunction } from 'map-transform'

const uriPart: CustomFunction = (_operands, _options) => (value, context) =>
  mapAny(function (value) {
    if (value === null || value === undefined) {
      return undefined
    }

    let part = value
    if (part instanceof Date) {
      part = part.toISOString()
    } else if (typeof part === 'object') {
      return undefined
    }

    return context.rev ? encodeURIComponent(part) : decodeURIComponent(part)
  }, value)

export default uriPart
