export default {
  id: 'user',
  service: 'users',
  shape: {
    username: 'string',
    firstname: 'string',
    lastname: 'string',
    yearOfBirth: 'integer',
    roles: 'string[]',
    tokens: 'string[]',
    feeds: 'feed[]',
    createdBy: 'user',
    createdAt: 'date',
    updatedAt: 'date',
    meta: {
      accounts: 'string[]',
    },
  },
  access: {
    identFromField: 'id',
  },
}
