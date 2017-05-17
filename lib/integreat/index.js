const createSource = require('../utils/createSource')
const router = require('./router')

/**
 * Return an integration object with a dispatch method.
 * Use the dispatch method for sending actions to sources, for retrieving typed
 * items and updating data.
 * @param {Object} params - Object with named parameters
 * @returns {Object} Integration object with the dispatch method
 */
function integreat ({sources: sourceDefs, types: typeArr, adapters} = {}) {
  if (!sourceDefs || !typeArr) {
    throw new TypeError('Call integreat with at least sources and types')
  }

  const sources = {}
  const createAndAddSourceFromDef = (def) => {
    sources[def.id] = createSource(def, (id) => adapters[id])
  }
  sourceDefs.forEach(createAndAddSourceFromDef)

  const types = {}
  const addType = (type) => { types[type.id] = type }
  typeArr.forEach(addType)

  return {
    async dispatch (action) {
      return await router(action, sources, types)
    }
  }
}

module.exports = integreat
