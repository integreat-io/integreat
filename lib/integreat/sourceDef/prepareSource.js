const prepareItem = require('./prepareItem')

/**
 * Prepare the source definition format for source creation.
 * @param {Object} def - Source definition object
 * @param {Object} resources - Object with adapters, auths, mappers, filters, and transforms
 * @returns {Object} An object groomed and ready for the itemMapper function
 */
function prepareSource (def = {}, {adapters = {}, auths, mappers, filters, transforms} = {}) {
  const adapter = adapters[def.adapter] || null
  const baseUri = def.baseUri || null
  const auth = (def.auth && auths) ? auths[def.auth] : null

  const formatEndpoint = (value) => (typeof value === 'string') ? {uri: value} : value
  const endpoints = ['one', 'all', 'some', 'send']
    .filter((prop) => def.endpoints && def.endpoints.hasOwnProperty(prop))
    .reduce((obj, prop) => Object.assign(obj, {[prop]: formatEndpoint(def.endpoints[prop])}), {})

  const createItem = (itemDef) => prepareItem(itemDef, {mappers, filters, transforms})
  const items = (def.items) ? def.items.map(createItem) : null

  return {
    adapter,
    auth,
    baseUri,
    endpoints,
    items
  }
}

module.exports = prepareSource
