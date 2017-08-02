module.exports = {
  id: 'couchdb',
  strategy: 'couchdb',
  options: {
    url: process.env.GR8_COUCH_URL,
    db: process.env.GR8_COUCH_DB,
    key: process.env.GR8_COUCH_KEY,
    password: process.env.GR8_COUCH_PASSWORD
  }
}
