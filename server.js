require('dotenv').config()
const integreat = require('.')
const debug = require('debug')('great')
const memory = require('./lib/queues/memory')

const lengthFormat = (value) => (value) ? value.length : 0

const sources = [
  require('./examples/accountsSource'),
  require('./examples/nytimesSource'),
  require('./examples/storeSource')
]
const datatypes = [
  require('./examples/accountType'),
  require('./examples/articleType')
]
const adapters = integreat.adapters()
const auths = integreat.authStrats()
const transformers = {}
const filters = {}
const formatters = Object.assign(
  {length: lengthFormat},
  integreat.formatters()
)
const workers = integreat.workers()

const queue = memory()

const great = integreat({
  sources,
  datatypes,
  adapters,
  auths,
  transformers,
  filters,
  formatters,
  workers,
  queue
})
debug('Integreat v' + great.version)

module.exports = great
