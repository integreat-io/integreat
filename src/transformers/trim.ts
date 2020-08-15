import { CustomFunction } from 'map-transform'

const trim: CustomFunction = (_operands, _options) => (value, _context) =>
  typeof value === 'string' ? value.trim() : value

export default trim
