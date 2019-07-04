export default {
  id: 'user',
  service: 'users',
  attributes: {
    username: 'string',
    firstname: 'string',
    lastname: 'string',
    yearOfBirth: 'integer',
    roles: 'string[]',
    tokens: 'string[]'
  },
  relationships: {
    feeds: 'feed',
    createdBy: 'user'
  },
  access: {
    identFromField: 'id'
  }
}
