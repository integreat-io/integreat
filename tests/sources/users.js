module.exports = {
  id: 'users',
  adapter: 'json',
  baseUri: 'http://some.api/users',
  endpoints: {
    get: {uri: '/', path: 'data[]'},
    getOne: {uri: '/{id}', path: 'data'}
  },
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
