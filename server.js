const integreat = require('./index')
const jsonAdapter = require('./lib/adapters/json')
// const optionsAuth = require('./lib/authStrats/options')
const TokenAuth = require('./lib/authStrats/token')

// const config = {
//   port: 3000,
//   db: {
//     url: process.env.GR8_COUCH_URL,
//     db: process.env.GR8_COUCH_DB,
//     key: process.env.GR8_COUCH_KEY,
//     password: process.env.GR8_COUCH_PASSWORD
//   }
// }

const lengthMap = (value) => (value) ? value.length : 0

const cloudant = new TokenAuth({
  token: process.env.GREAT_TOKEN1,
  encode: true,
  type: 'Basic'
})

const sourceDefs = []
const typeDefs = []
const adapters = {json: jsonAdapter}
const mappers = {length: lengthMap}
const filters = {}
const auths = {cloudant}

const great = integreat(sourceDefs, typeDefs, {
  adapters,
  mappers,
  filters,
  auths
})

console.log(great.version)

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
