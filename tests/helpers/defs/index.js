module.exports = {
  datatypes: [
    require('./datatypes/entry'),
    require('./datatypes/user')
  ],
  sources: [
    require('./sources/entries'),
    require('./sources/users')
  ],
  mappings: [
    require('./mappings/entries-entry'),
    require('./mappings/users-user')
  ],
  ident: {
    type: 'user'
  }
}
