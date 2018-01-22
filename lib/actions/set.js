const debug = require('debug')('great')
const createError = require('../utils/createError')

const castItem = (datatypes, useDefaults, item) => {
  const datatype = datatypes[item.type]
  return datatype.cast(item, {useDefaults})
}
const cast = (datatypes, useDefaults, items) => Array.isArray(items)
  ? items.map((item) => castItem(datatypes, useDefaults, item))
  : castItem(datatypes, useDefaults, items)

function castData (source, payload, datatypes) {
  const {data, useDefaults = false} = payload

  const mappedFrom = cast(datatypes, useDefaults, data)
  const mappedTo = source.mapToSource(mappedFrom)

  return {mappedFrom, mappedTo}
}

/**
 * Set several items to a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Object} Response object with any data returned from the source
 */
async function set (payload, {getSource, datatypes}) {
  debug('Action: SET')
  if (!payload) {
    debug('SET: No payload')
    return createError('No payload')
  }

  const {source: sourceId, data, params, endpoint} = payload
  const type = payload.type || data.type
  const id = data.id
  const source = getSource(type, sourceId)

  if (!source) {
    debug(`SET: No source '${sourceId}'`)
    return createError(`No source '${sourceId}'`)
  }

  const {mappedFrom, mappedTo} = castData(source, payload, datatypes)

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('SET: Send to source %s at %s', source.id, endpointDebug)

  const request = source.prepareRequest({
    action: 'SET',
    type,
    endpoint,
    params: {id, ...params},
    data: mappedTo
  })
  const response = await source.send(request)

  return (response.status === 'ok') ? {...response, data: [].concat(mappedFrom)} : response
}

module.exports = set
