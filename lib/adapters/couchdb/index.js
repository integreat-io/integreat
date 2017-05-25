const jsonAdapter = require('../json')
const debug = require('debug')('great:couchdb')

const fromDb = (data) => {
  const ret = Object.assign({id: data._id}, data)
  delete ret._id
  return ret
}

const toDb = (data) => {
  const ret = Object.assign({_id: data.id}, data)
  delete ret.id
  return ret
}

const retrieveRev = async (url, auth) => {
  try {
    const existing = await couchdb.retrieve(url, auth)
    return existing._rev
  } catch (err) {
    return null
  }
}

const couchdb = {
  /**
   * Retrieve the given endpoint and return as a object.
   * The returned object will be passed to the adapter's `normalize` method.
   *
   * If an auth strategy is provided, authorization is attempted if not already
   * authenticated, and a successfull authentication is required before retrieving
   * the source with auth headers from the auth strategy.
   *
   * @param {string} url - Url of endpoint to retrieve
   * @param {Object} auth - An auth strategy
   * @returns {Object} Source data as an object
   */
  retrieve: jsonAdapter.retrieve,

  /**
   * Send the given data to the url, and return status data.
   * The data object has been passed through the adapter's `serialize` method.
   *
   * If an auth strategy is provided, authorization is attempted if not already
   * authenticated, and a successfull authentication is required before sending
   * the data with auth headers from the auth strategy.
   *
   * @param {string} url - Url of endpoint to send to
   * @param {Object} data - Data to send
   * @param {Object} auth - An auth strategy
   * @param {string} method - The method to use. Default is PUT
   * @returns {Object} Object with status and data
   */
  async send (url, data, auth = null, method = 'PUT') {
    debug('Send to url %s', url)
    const rev = await retrieveRev(url, auth)
    if (rev) {
      debug('... with rev %s', rev)
      data = Object.assign({}, data, {_rev: rev})
    }

    return await jsonAdapter.send(url, data, auth, method)
  },

  /**
   * Normalize data from the source.
   * Will convert from _id to id.
   * Returns an object starting from the given path.
   * @param {Object} data - The data to normalize
   * @param {string} path - The path to start from
   * @returns {Object} Normalized data
   */
  async normalize (data, path = null) {
    const json = await jsonAdapter.normalize(data, path)
    return (Array.isArray(json)) ? json.map(fromDb) : fromDb(json)
  },

  /**
   * Serialize data before sending to the source.
   * Will convert from id to _id.
   * Will set the given data as a property according to the path, if specified.
   * @param {Object} data - The data to serialize
   * @param {string} path - The path to start from
   * @returns {Object} Serialized data
   */
  async serialize (data, path) {
    const json = (Array.isArray(data)) ? data.map(toDb) : toDb(data)
    return await jsonAdapter.serialize(json, path)
  }
}

module.exports = couchdb
