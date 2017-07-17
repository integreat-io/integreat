require('dotenv').config()
const integreat = require('.')
const debug = require('debug')('great')

const lengthTransform = (value) => (value) ? value.length : 0

const sources = [
  require('./examples/accountsSource'),
  require('./examples/nytimesSource'),
  require('./examples/storeSource')
]
const types = [
  require('./examples/accountType'),
  require('./examples/articleType')
]
const adapters = integreat.adapters()
const auths = integreat.authStrats()
const mappers = {}
const filters = {}
const transforms = Object.assign(
  {length: lengthTransform},
  integreat.transforms()
)
const workers = integreat.workers()

const great = integreat({
  sources,
  types,
  adapters,
  auths,
  mappers,
  filters,
  transforms,
  workers
})
debug('Integreat v' + great.version)

module.exports = great

// Load default mappers and filters
// great.loadDefaults()

// great.on('sync', (source, items) => {
//   console.log('Synced %d items for source `%s` at %s.', items.length, source.id, new Date())
// })

// Load source definitions from database
// great.loadSourceDefsFromDb()

// Start server
// .then(() => great.start())

// Server is running
// .then((server) => {
//   if (server) {
//     console.log('Integreat is running on port %d.', server.address().port)
//   } else {
//     console.log('Integreat is running without a http server')
//   }
// })
