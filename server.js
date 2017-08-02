require('dotenv').config()
const integreat = require('.')
const debug = require('debug')('great')

const lengthFormat = (value) => (value) ? value.length : 0

const defs = {
  sources: [
    require('./examples/accountsSource'),
    require('./examples/nytimesSource'),
    require('./examples/storeSource')
  ],
  datatypes: [
    require('./examples/accountType'),
    require('./examples/articleType')
  ]
}
const resources = {
  adapters: integreat.adapters(),
  transformers: {},
  filters: {},
  formatters: Object.assign(
    {length: lengthFormat},
    integreat.formatters()
  ),
  workers: integreat.workers(),
  authstrats: integreat.authstrats()
}

const great = integreat(defs, resources)
debug('Integreat v' + great.version)

module.exports = great
