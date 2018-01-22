const debug = require('debug')('great')
const createError = require('../utils/createError')

const castItem = (datatypes, useDefaults, item) => {
  const datatype = datatypes[item.type]
  return datatype.cast(item, {useDefaults})
}
const cast = (datatypes, useDefaults, items) => Array.isArray(items)
  ? items.map((item) => castItem(datatypes, useDefaults, item))
  : castItem(datatypes, useDefaults, items)

const mapFromSource = (source, useDefaults, items, type) => source.mapFromSource(items, {useDefaults, type})

function mapData (source, payload, datatypes, getSource) {
  const {type, id, useDefaults = false, endpoint, unmapped, origin} = payload

  const mappedFrom = (unmapped && origin && getSource(null, origin))
    ? mapFromSource(getSource(null, origin), useDefaults, payload.data, type)
    : cast(datatypes, useDefaults, payload.data)

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('SET: Send to source %s at %s', source.id, endpointDebug)

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

  const {source: sourceId, data, id, params, endpoint} = payload
  const type = payload.type || data.type
  const source = getSource(type, sourceId)

  if (!source) {
    debug(`SET: No source '${sourceId}'`)
    return createError(`No source '${sourceId}'`)
  }

  const {mappedFrom, mappedTo} = mapData(source, payload, datatypes, getSource)

  const request = source.prepareRequest({
    action: 'SET',
    type,
    endpoint,
    params: {...params, id: id || data.id},
    data: mappedTo
  })
  const response = await source.send(request)

  return (response.status === 'ok') ? {...response, data: mappedFrom} : response
}

module.exports = set
