module.exports = {
  id: 'user',
  source: 'users',
  attributes: {
    username: 'string',
    firstname: 'string',
    lastname: 'string',
    yearOfBirth: 'integer'
  },
  relationships: {
    feeds: 'feed'
  }
}
