import { Transformer } from 'map-transform'

const not: Transformer = (_operands, _options) => (value, _context) => !value

export default not
