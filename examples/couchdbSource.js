module.exports = {
  id: 'couchdb',
  adapter: 'couchdb',
  baseUri: `${process.env.GR8_COUCH_URL}/${process.env.GR8_COUCH_DB}`,
  endpoints: {
    all: {uri: '/_all_docs', path: 'rows'},
    one: '/{type}:{id}',
    send: '/{type}:{id}'
  },
  items: [{
    type: 'account',
    attributes: [
      {key: 'id'},
      {key: 'username', path: 'attributes.username'},
      {key: 'createdAt'},
      {key: 'updatedAt'}
    ]
  }]
}
