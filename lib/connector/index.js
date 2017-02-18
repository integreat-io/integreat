const getFn = require('./get')
const setFn = require('./set')
const allFn = require('./all')

/** Class representing a connector to an item type */
class Connector {
  /**
   * Create a connector with the given type.
   * @param {Object} db - Db to give access to
   * @param {string} type - Item type to connect to
   */
  constructor (db, type) {
    this._db = db
    this._type = type
  }

  /**
   * Get an item with the given id. The type is given by the connector.
   * @param {string} id - The id of the item to get
   * @returns {Promise} Promise of the item
   */
  get (id) {
    return getFn(this._db, id, this._type)
  }

  /**
   * Set an item. The id and type are gotten from the item.
   * @param {Object} item - The item to set
   * @returns {Promise} Promise that resolves when set
   */
  set (item) {
    return setFn(this._db, item)
  }

  /**
   * Get all items of the type given by the connector.
   * @returns {Promise} Promise of items
   */
  all () {
    return allFn(this._db, this._type)
  }
}

module.exports = Connector
