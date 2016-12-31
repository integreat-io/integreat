const Integreat = require('./index')

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

great.loadDefaults()
// great.loadSourceDefsFromDb()

const sourceFns = {
  sourcetype: 'json',
  fetch: {
    endpoint: 'http://api.feednstatus.com/1.0/accounts',
    path: 'data'
  },
  item: {
    type: 'account',
    attributes: {
      id: {path: 'id'},
      name: {path: 'attributes.name'}
    }
  },
  sync: {
    schedule: 60
  }
}
great.setSource('fnsaccount', sourceFns)

great.start()
.then((server) => {
  console.log('Integreat is running on port %d.', server.address().port)
})