module.exports = {
  id: 'users',
  adapter: 'json',
  baseUri: 'http://some.api/users',
  endpoints: [
    {action: 'GET', scope: 'collection', options: {uri: '/', path: 'data[]'}},
    {action: 'SET', scope: 'collection', options: {uri: '/', path: 'data[]', method: 'POST'}},
    {action: 'GET', scope: 'member', options: {uri: '/{id}', path: 'data'}},
    {action: 'GET', params: {tokens: true}, options: {uri: '{?tokens}', path: 'data'}}
  ]
}
