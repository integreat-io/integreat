const debug = require('debug')('great')
const createError = require('../utils/createError')

const prepareMeta = (keys, meta) => (keys)
  ? [].concat(keys)
    .filter((key) => key !== 'createdAt' && key !== 'updatedAt')
    .reduce((ret, key) =>
      ({...ret, [key]: meta[key] || null}), {})
  : prepareMeta(Object.keys(meta), meta)

const sendMetaRequest = async (source, params, endpoint, ident, sourceId) => {
  const request = {
    action: 'GET',
    params,
    endpoint,
    access: {ident}
  }
  const {response} = await source.send(request)

  if (response.status === 'ok') {
    const {data} = response
    const meta = prepareMeta(params.keys, data[0].attributes)
    return {...response, data: {source: sourceId, meta}}
  } else {
    return response
  }
}

/**
 * Get metadata for a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Promise} Promise of metdata
 */
async function getMeta ({payload, ident}, {getSource}) {
  debug('Action: GET_META')

  if (!payload) {
    debug('GET_META: No payload')
    return createError('No payload')
  }

  const {
    source: sourceId,
    endpoint,
    keys
  } = payload
  const id = `meta:${sourceId}`

  const source = getSource(null, sourceId)
  if (!source) {
    debug(`GET_META: Source '${sourceId}' doesn't exist`)
    return createError(`Source '${sourceId}' doesn't exist`)
  }

  const type = source.meta
  const metaSource = getSource(type)
  if (!metaSource) {
    return createError(`Source '${source.id}' doesn't support metadata (setting was '${source.meta}')`)
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('GET_META: Get meta %s for source \'%s\' on source \'%s\' at %s',
    keys, source.id, metaSource.id, endpointDebug)

  return sendMetaRequest(metaSource, {keys, type, id}, endpoint, ident, sourceId)
}

module.exports = getMeta
