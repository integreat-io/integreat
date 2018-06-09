module.exports = {
  type: 'user',
  service: 'users',
  attributes: {
    id: 'user',
    username: 'user',
    firstname: 'forename',
    lastname: 'surname',
    yearOfBirth: 'birthyear',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    roles: 'roles[]',
    tokens: 'tokens[]'
  },
  relationships: {
    feeds: 'feeds[]'
  }
}
