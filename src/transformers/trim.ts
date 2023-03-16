import type { Transformer } from 'map-transform/types.js'

const trim: Transformer = () => () => (value, _context) =>
  typeof value === 'string' ? value.trim() : value

export default trim
