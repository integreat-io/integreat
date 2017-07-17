module.exports = {
  id: 'store',
  adapter: 'couchdb',
  baseUri: `${process.env.GR8_COUCH_URL}/${process.env.GR8_COUCH_DB}`,
  endpoints: {
    all: {uri: '/_all_docs', path: 'rows'},
    one: '/{type}:{id}',
    send: '/{type}:{id}'
  },
  mappings: {
    '*': {}
  }
}
