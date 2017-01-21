const Integreat = require('./index')

const lengthMap = (value) => (value) ? value.length : 0

const config = {
  port: 3000,
  db: {
    url: process.env.GR8_COUCH_URL,
    db: process.env.GR8_COUCH_DB,
    key: process.env.GR8_COUCH_KEY,
    password: process.env.GR8_COUCH_PASSWORD
  }
}

const great = new Integreat(config)

// Load default mappers and filters
great.loadDefaults()
// Add custom mapper
great.setMapper('length', lengthMap)

great.on('sync', (source, items) => {
  console.log('Synced %d items for source `%s` at %s.', items.length, source.id, new Date())
})

// Load source definitions from database
great.loadSourceDefsFromDb()

// Start server
.then(() => great.start())

// Server is running
.then((server) => {
  if (server) {
    console.log('Integreat is running on port %d.', server.address().port)
  } else {
    console.log('Integreat is running without a http server')
  }
})
