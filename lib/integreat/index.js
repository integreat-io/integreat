const source = require('./source')
const prepare = require('./sourceDef/prepareSource')
const router = require('./router')
const reduceToObject = require('../utils/reduceToObject')

const version = '0.1'

const formatTypeVal = (val) => (typeof val === 'string') ? {type: val} : val
const reduceFormattedVal = (vals) => (obj, val) => Object.assign(obj, {[val]: formatTypeVal(vals[val])})
const prepareVals = (vals) => (vals) ? Object.keys(vals).reduce(reduceFormattedVal(vals), {}) : vals
const prepareType = (type) => Object.assign({}, type, {
  attributes: prepareVals(type.attributes),
  relationships: prepareVals(type.relationships)
})

/**
 * Return an integration object with a dispatch method.
 * Use the dispatch method for sending actions to sources, for retrieving typed
 * items and updating data.
 * @param {Array} sourceDefs - Array of source definitions
 * @param {Array} typeDefs - Array of type definitions
 * @param {Object} resources - Object with adapters, auths, mappers, filters, transforms, and workers
 * @returns {Object} Integration object with the dispatch method
 */
function integreat (sourceDefs, typeDefs, {
  adapters, auths, mappers, filters, transforms, workers
} = {}) {
  if (!sourceDefs || !typeDefs) {
    throw new TypeError('Call integreat with at least sources and types')
  }

  const types = typeDefs.map(prepareType).reduce(reduceToObject('id'), {})

  const sources = sourceDefs
    .map((def) => source(
      def.id,
      prepare(def, {types, adapters, auths, mappers, filters, transforms})
    ))
    .reduce(reduceToObject('id'), {})

  return {
    version,

    async dispatch (action) {
      return await router(
        action,
        {sources, types, workers, dispatch: this.dispatch}
      )
    }
  }
}

module.exports = integreat
