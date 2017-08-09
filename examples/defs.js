module.exports = {
  sources: [
    require('./sources/accounts'),
    require('./sources/nytimes'),
    require('./sources/store')
  ],
  datatypes: [
    require('./types/account'),
    require('./types/article')
  ],
  auths: [
    require('./auths/couchdb')
  ]
}
