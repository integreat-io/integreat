const prepareItem = require('./prepareItem')
const reduceToObject = require('../../utils/reduceToObject')

/**
 * Prepare the source definition format for source creation.
 * @param {Object} def - Source definition object
 * @param {Object} resources - Object with adapters, auths, mappers, filters, transforms, and types
 * @returns {Object} An object groomed and ready for the itemMapper function
 */
function prepareSource (def = {}, {adapters = {}, auths, mappers, filters, transforms, types = {}} = {}) {
  const adapter = adapters[def.adapter] || null
  const auth = (def.auth && auths) ? auths[def.auth] : null
  const {baseUri = null} = def

  const formatEndpoint = (value) => (typeof value === 'string') ? {uri: value} : value
  const endpoints = ['one', 'all', 'some', 'send']
    .filter((prop) => def.endpoints && def.endpoints.hasOwnProperty(prop))
    .reduce((obj, prop) => Object.assign(obj, {[prop]: formatEndpoint(def.endpoints[prop])}), {})

  const createItem = (itemDef) => prepareItem(itemDef, {mappers, filters, transforms, typeDef: types[itemDef.type]})
  const items = Object.keys(def.items || {})
    .map((type) => Object.assign({type}, def.items[type]))
    .map(createItem)
    .reduce(reduceToObject('type'), {})

  return {
    adapter,
    auth,
    baseUri,
    endpoints,
    items
  }
}

module.exports = prepareSource
