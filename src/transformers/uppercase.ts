import mapAny = require('map-any')
import { CustomFunction } from 'map-transform'

const uppercase: CustomFunction = (_operands, _options) => (value, _context) =>
  mapAny(
    (value) => (typeof value === 'string' ? value.toUpperCase() : value),
    value
  )

export default uppercase
