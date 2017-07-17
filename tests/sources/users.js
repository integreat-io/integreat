module.exports = {
  id: 'users',
  adapter: 'json',
  baseUri: 'http://some.api/users',
  endpoints: {
    one: {uri: '/{id}', path: 'data'},
    all: {uri: '/', path: 'data'}
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
