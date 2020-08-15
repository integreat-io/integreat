import mapAny = require('map-any')
import { CustomFunction } from 'map-transform'

const lowercase: CustomFunction = (_operands, _options) => (value, _context) =>
  mapAny(
    (value) => (typeof value === 'string' ? value.toLowerCase() : value),
    value
  )

export default lowercase
