module.exports = {
  id: 'entries',
  adapter: 'json',
  baseUri: 'http://some.api/entries',
  endpoints: [
    {action: 'GET', scope: 'collection', options: {uri: '/', path: 'data[]'}},
    {action: 'GET', scope: 'member', options: {uri: '/{id}', path: 'data'}},
    {action: 'GET', params: {author: true}, options: {uri: '{?author}', path: 'data'}}
  ]
}
