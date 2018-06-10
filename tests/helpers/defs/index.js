module.exports = {
  schemas: [
    require('./schemas/entry'),
    require('./schemas/user')
  ],
  services: [
    require('./services/entries'),
    require('./services/users')
  ],
  mappings: [
    require('./mappings/entries-entry'),
    require('./mappings/users-user')
  ],
  ident: {
    type: 'user'
  }
}
