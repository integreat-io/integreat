export default {
  id: 'user',
  service: 'users',
  fields: {
    username: 'string',
    firstname: 'string',
    lastname: 'string',
    yearOfBirth: 'integer',
    roles: 'string[]',
    tokens: 'string[]',
    feeds: 'feed'
  },
  access: {
    identFromField: 'id'
  }
}
