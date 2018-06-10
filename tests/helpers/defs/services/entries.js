module.exports = {
  id: 'entries',
  adapter: 'json',
  options: {baseUri: 'http://some.api/entries'},
  endpoints: [
    {match: {action: 'GET', scope: 'collection'}, options: {uri: '/', path: 'data[]'}},
    {match: {action: 'SET', scope: 'collection'}, options: {uri: '/', path: 'data[]', method: 'POST'}},
    {match: {scope: 'member'}, options: {uri: '/{id}', path: 'data'}},
    {match: {action: 'GET', params: {author: true}}, options: {uri: '{?author}', path: 'data'}}
  ]
}
