const crypto = require('crypto')

const replaceRegex = /[+/=]/g

const replaceReserved = hash => {
  return hash.replace(replaceRegex, match => {
    switch (match) {
      case '+':
        return '-'
      case '/':
        return '_'
      case '=':
        return '~'
    }
  })
}

function hash(value) {
  if (value === null || value === undefined || value === '') {
    return value
  }
  value = String(value)
  const hasher = crypto.createHash('sha256')
  return replaceReserved(hasher.update(value).digest('base64'))
}

export default hash
