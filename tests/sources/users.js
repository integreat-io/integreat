module.exports = {
  id: 'users',
  adapter: 'json',
  baseUri: 'http://some.api/users',
  endpoints: {
    get: {uri: '/', path: 'data'},
    getone: {uri: '/{id}', path: 'data'}
  },
  mappings: {
    user: {
      attributes: {
        id: {path: 'user'},
        username: {path: 'user'},
        firstname: {path: 'forename'},
        lastname: {path: 'surname'},
        yearOfBirth: {path: 'birthyear'}
      }
    }
  }
}
