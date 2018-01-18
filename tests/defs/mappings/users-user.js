module.exports = {
  type: 'user',
  source: 'users',
  attributes: {
    id: 'user',
    username: 'user',
    firstname: 'forename',
    lastname: 'surname',
    yearOfBirth: 'birthyear',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  relationships: {
    feeds: 'feeds[]'
  }
}
