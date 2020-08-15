import crypto = require('crypto')
import { CustomFunction } from 'map-transform'

const replaceRegex = /[+/=]/g

const replaceReserved = (hash: string) => {
  return hash.replace(replaceRegex, (match: string) => {
    switch (match) {
      case '+':
        return '-'
      case '/':
        return '_'
      case '=':
        return '~'
      default:
        return match
    }
  })
}

const hash: CustomFunction = (_operands) =>
  function hash(value, _context) {
    if (value === null || value === undefined || value === '') {
      return value
    }
    const hasher = crypto.createHash('sha256')
    const hash = hasher.update(String(value)).digest('base64')
    return replaceReserved(hash)
  }

export default hash
