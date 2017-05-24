const createSource = require('./createSource')
const router = require('./router')

const version = '0.1'

/**
 * Return an integration object with a dispatch method.
 * Use the dispatch method for sending actions to sources, for retrieving typed
 * items and updating data.
 * @param {Array} sourceDefs - Array of source definitions
 * @param {Array} typeDefs - Array of type definitions
 * @param {Object} resources - Object with adapters, mappers, filters, and auths
 * @returns {Object} Integration object with the dispatch method
 */
function integreat (sourceDefs, typeDefs, resources = {}) {
  if (!sourceDefs || !typeDefs) {
    throw new TypeError('Call integreat with at least sources and types')
  }

  const setSource = (obj, def) => Object.assign({}, obj, {
    [def.id]: createSource(def, resources)
  })
  const sources = sourceDefs.reduce(setSource, {})

  const setType = (obj, type) => Object.assign({}, obj, {[type.id]: type})
  const types = typeDefs.reduce(setType, {})

  return {
    version,

    async dispatch (action) {
      return await router(action, sources, types)
    }
  }
}

module.exports = integreat
