const source = require('./source')
const prepare = require('./sourceDef/prepareSource')
const router = require('./router')
const reduceToObject = require('../utils/reduceToObject')

const version = '0.1'

const formatTypeVal = (val) => (typeof val === 'string') ? {type: val} : val
const reduceFormattedVal = (vals) => (obj, val) => Object.assign(obj, {[val]: formatTypeVal(vals[val])})
const prepareVals = (vals) => (vals) ? Object.keys(vals).reduce(reduceFormattedVal(vals), {}) : vals

/**
 * Return an integration object with a dispatch method.
 * Use the dispatch method for sending actions to sources, for retrieving typed
 * items and updating data.
 * @param {Array} sourceDefs - Array of source definitions
 * @param {Array} typeDefs - Array of type definitions
 * @param {Object} resources - Object with adapters, auths, mappers, filters, and transforms
 * @returns {Object} Integration object with the dispatch method
 */
function integreat (sourceDefs, typeDefs, resources = {}) {
  if (!sourceDefs || !typeDefs) {
    throw new TypeError('Call integreat with at least sources and types')
  }

  const prepareType = (type) => Object.assign({}, type, {
    attributes: prepareVals(type.attributes),
    relationships: prepareVals(type.relationships)
  })
  const types = typeDefs.map(prepareType).reduce(reduceToObject('id'), {})

  const sources = sourceDefs
    .map((def) => source(def.id, prepare(def, Object.assign({types}, resources))))
    .reduce(reduceToObject('id'), {})

  return {
    version,

    async dispatch (action) {
      return await router(action, sources, types)
    }
  }
}

module.exports = integreat
