const Dbdb = require('dbdb').couchdb
const storeItemDb = require('./storeItem')
const fetchItemDb = require('./fetchItem')
const fetchByTypeDb = require('./fetchByType')

class Storage {
  constructor (config) {
    this._db = new Dbdb(config)
  }

  storeItem (item) {
    return storeItemDb(this._db, item)
  }

  fetchItem (id, type) {
    return fetchItemDb(this._db, id, type)
  }

  fetchByType (type) {
    return fetchByTypeDb(this._db, type)
  }
}

module.exports = Storage
