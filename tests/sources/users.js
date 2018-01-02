module.exports = {
  id: 'users',
  adapter: 'json',
  baseUri: 'http://some.api/users',
  endpoints: [
    {action: 'GET', scope: 'collection', options: {uri: '/', path: 'data[]'}},
    {action: 'GET', scope: 'member', options: {uri: '/{id}', path: 'data'}}
  ],
  mappings: {
    user: {
      attributes: {
        id: 'user',
        username: 'user',
        firstname: 'forename',
        lastname: 'surname',
        yearOfBirth: 'birthyear'
      },
      relationships: {
        feeds: 'feeds[]'
      }
    }
  }
}
