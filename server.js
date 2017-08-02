require('dotenv').config()
const integreat = require('.')
const debug = require('debug')('great')

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
const resources = integreat.resources()

const great = integreat(defs, resources)
debug('Integreat v' + great.version)

module.exports = great
