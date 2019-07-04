export default {
  id: 'users',
  adapter: 'json',
  options: { baseUri: 'http://some.api/users' },
  endpoints: [
    { match: { action: 'GET', scope: 'collection' }, responseMapping: 'data[]', options: { uri: '/' } },
    { match: { action: 'SET', scope: 'collection' }, responseMapping: 'data[]', options: { uri: '/', method: 'POST' } },
    { match: { action: 'GET', scope: 'member' }, responseMapping: 'data', options: { uri: '/{id}' } },
    { match: { action: 'GET', params: { tokens: true } }, responseMapping: 'data', options: { uri: '{?tokens}' } }
  ],
  mappings: {
    user: 'users-user'
  }
}
