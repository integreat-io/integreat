module.exports = {
  id: 'couchdb',
  strategy: 'couchdb',
  options: {
    uri: process.env.GR8_COUCH_URL,
    key: process.env.GR8_COUCH_KEY,
    secret: process.env.GR8_COUCH_PASSWORD
  }
}
