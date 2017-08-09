module.exports = {
  id: 'store',
  adapter: 'couchdb',
  auth: 'couchdb',
  baseUri: `${process.env.GR8_COUCH_URL}/${process.env.GR8_COUCH_DB}`,
  endpoints: {
    get: {uri: '/_all_docs', path: 'rows'},
    getone: '/{type}:{id}',
    setone: '/{type}:{id}'
  },
  mappings: {
    '*': {}
  }
}
