module.exports = {
  id: 'user',
  source: 'users',
  attributes: {
    username: 'string',
    firstname: 'string',
    lastname: 'string',
    yearOfBirth: 'integer',
    roles: 'string[]',
    tokens: 'string[]'
  },
  relationships: {
    feeds: 'feed'
  },
  access: {
    access: {identFromField: 'id'}
  }
}
