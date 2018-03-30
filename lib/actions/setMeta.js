const debug = require('debug')('great')
const createError = require('../utils/createError')

/**
 * Set metadata on a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Promise} Promise that will be resolved when metadata is set
 */
async function setMeta ({payload, ident}, {getSource}) {
  debug('Action: SET_META')

  if (!payload) {
    debug('SET_META: No payload')
    return createError('No payload')
  }

  const {
    source: sourceId,
    meta,
    endpoint
  } = payload
  const id = `meta:${sourceId}`

  const source = getSource(null, sourceId)
  if (!source) {
    debug(`SET_META: Source '${sourceId}' doesn't exist`)
    return createError(`Source '${sourceId}' doesn't exist`)
  }

  const type = source.meta
  const metaSource = getSource(type)
  if (!metaSource) {
    debug(`SET_META: Source '${source.id}' doesn't support metadata (setting was '${source.meta}')`)
    return {status: 'noaction'}
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('SET_META: Send metadata %o for source \'%s\' on source \'%s\' %s',
    meta, source.id, metaSource.id, endpointDebug)

  const request = {
    action: 'SET',
    endpoint,
    params: {keys: Object.keys(meta), type, id},
    data: {id, type, attributes: meta},
    access: {ident}
  }
  const {response} = await metaSource.send(request, {useDefaults: false})
  return response
}

module.exports = setMeta
