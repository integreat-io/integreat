const R = require('ramda')
const prepareEndpoints = require('../endpoints')
const requestFromAction = require('./requestFromAction')
const send = require('./send')

const lookup = (id, resource) => (typeof id === 'string') ? resource[id] : id

/**
 * Create a service with the given id and adapter.
 * @param {Object} def - Service definition
 * @param {Object} resources - Object with mappings, adapters, auths, and plurals
 * @returns {Object} The created service
 */
const service = ({
  mappings: allMappings = [],
  adapters = {},
  auths = {},
  setupMapping = R.identity
} = {}) => ({
  id: serviceId,
  adapter,
  auth = null,
  meta = null,
  options: serviceOptions = {},
  endpoints = [],
  mappings: mappingsDef = {}
}) => {
  if (!serviceId) {
    throw new TypeError(`Can't create service without an id.`)
  }
  // Switch adapter id with the actual adapter
  adapter = lookup(adapter, adapters)
  if (!adapter) {
    throw new TypeError(`Can't create service '${serviceId}' without an adapter.`)
  }

  // Switch an auth id with actual auth object
  const { authenticator, authOptions } = lookup(auth, auths) || {}

  // Prepare endpoints
  endpoints = prepareEndpoints(endpoints, adapter, serviceOptions)

  // Prepare all mappings for this service
  const prepareMappings = R.compose(
    R.map(setupMapping),
    R.mapObjIndexed((mapping, type) => ({ ...mapping, type })),
    R.filter(R.complement(R.isNil)),
    R.map((mapping) => (typeof mapping === 'string')
      ? allMappings.find((m) => m.id === mapping) : mapping)
  )
  const mappings = prepareMappings(mappingsDef)

  // Convenience object for schemas found in mappings
  const schemas = Object.keys(mappings)
    .reduce((schemas, key) => ({ ...schemas, [key]: mappings[key].schema }), {})

  const sendFn = send({
    schemas,
    mappings,
    adapter,
    authenticator,
    authOptions
  })

  // Create the service instance
  return {
    id: serviceId,
    adapter,
    meta,
    endpoints: endpoints.list,

    /**
     * The given action is prepared, authenticated, and mapped, before it is
     * sent to the service via the adapter. The response from the adapter is then
     * mapped, authenticated, and returned.
     *
     * The prepared and authenticated request is also returned.
     *
     * @param {Object} action - Action object to map and send to the service
     * @param {Object} options - onlyMappedValues and unmapped
     * @returns {Object} Object with the sent request and the received response
     */
    async send (action) {
      const endpoint = endpoints.match(action)
      return sendFn({
        request: requestFromAction(action, { endpoint, schemas }),
        endpoint
      })
    }
  }
}

module.exports = service
