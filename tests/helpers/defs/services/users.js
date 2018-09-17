module.exports = {
  id: 'users',
  adapter: 'json',
  options: { baseUri: 'http://some.api/users' },
  endpoints: [
    { match: { action: 'GET', scope: 'collection' }, options: { uri: '/', path: 'data[]' } },
    { match: { action: 'SET', scope: 'collection' }, options: { uri: '/', path: 'data[]', method: 'POST' } },
    { match: { action: 'GET', scope: 'member' }, options: { uri: '/{id}', path: 'data' } },
    { match: { action: 'GET', params: { tokens: true } }, options: { uri: '{?tokens}', path: 'data' } }
  ],
  mappings: {
    user: 'users-user'
  }
}
