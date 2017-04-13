const jsonAdapter = require('../json')

const fromDb = (source) => {
  const target = Object.assign({id: source._id}, source)
  delete target._id
  return target
}

module.exports = {
  /**
   * Retrieve the given endpoint and return as an object.
   * The returned object will be passed to the adapter's `normalize` method.
   *
   * If an auth strategy is provided, authorization is attempted if not already
   * authenticated, and a successfull authentication is required before retrieving
   * the source with auth headers from the auth strategy.
   *
   * @param {string} endpoint - Url of endpoint to retrieve
   * @param {Object} auth - An auth strategy
   * @returns {Promise} Source data as an object
   */
  retrieve: jsonAdapter.retrieve,

  /**
    * Normalize the source. Returns an object starting from the given path.
    * @param {Object} source - The source object
    * @param {string} path - The path to start from
    * @returns {Promise} Normalized item(s)
    */
  async normalize (source, path) {
    const data = await jsonAdapter.normalize(source, path)
    return (Array.isArray(data)) ? data.map(fromDb) : fromDb(data)
  }
}
