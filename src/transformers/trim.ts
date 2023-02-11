import { Transformer } from 'map-transform'

const trim: Transformer = (_operands, _options) => (value, _context) =>
  typeof value === 'string' ? value.trim() : value

export default trim
