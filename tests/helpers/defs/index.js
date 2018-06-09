module.exports = {
  datatypes: [
    require('./datatypes/entry'),
    require('./datatypes/user')
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
