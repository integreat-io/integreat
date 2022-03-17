import { nanoid } from 'nanoid'
import { v4 as uuidv4 } from 'uuid'

export interface Operands {
  type?: string
}

export default ({ type }: Operands) =>
  function unique(_value: unknown, _context: unknown): string | undefined {
    switch (type) {
      case 'uuid':
      case 'uuidLower':
        return uuidv4()
      case 'uuidUpper':
        return uuidv4().toUpperCase()
      default:
        return nanoid()
    }
  }
