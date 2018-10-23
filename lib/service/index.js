const R = require('ramda')
const prepareEndpoints = require('../endpoints')
const requestFromAction = require('./requestFromAction')
const send = require('./send')
const createError = require('../utils/createError')

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
  transformers = {},
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

  // Prepare endpoints
  endpoints = prepareEndpoints(endpoints, adapter, transformers, serviceOptions)

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

  // Get the actual auth object
  auth = lookup(auth, auths) || {}

  // Set authentictation object on auth object shared with other services
  const setAuthentication = (authentication) => {
    auth.authentication = authentication
  }

  let connection = null
  const setConnection = (conn) => {
    connection = conn
  }

  const sendFn = send({
    serviceId,
    schemas,
    mappings,
    adapter,
    authenticator: auth.authenticator,
    authOptions: auth.options,
    setAuthentication,
    setConnection,
    serviceOptions
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
      if (!endpoint) {
        return { response: createError(`No endpoint specified on request to service '${serviceId}'.`) }
      }

      return sendFn({
        request: requestFromAction(action, { endpoint, schemas }),
        endpoint,
        authentication: auth.authentication,
        connection
      })
    }
  }
}

module.exports = service
