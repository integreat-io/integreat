import { CustomFunction } from 'map-transform'

const not: CustomFunction = (_operands, _options) => (value, _context) => !value

export default not
