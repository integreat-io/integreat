const crypto = require('crypto')

const replaceRegex = /[+/=]/g

const replaceReserved = (hash) => {
  return hash.replace(replaceRegex, (match) => {
    switch (match) {
      case '+': return '-'
      case '/': return '_'
      case '=': return '~'
    }
  })
}

function hash (string) {
  if (string === null || string === undefined || string === '') {
    return string
  }
  string = String(string)
  const hasher = crypto.createHash('sha256')
  return replaceReserved(hasher.update(string).digest('base64'))
}

module.exports = hash
