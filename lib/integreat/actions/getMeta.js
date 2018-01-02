const debug = require('debug')('great')
const createError = require('../../utils/createError')

const getMetaSource = (source, getSource) => {
  const {handleMeta} = source
  if (handleMeta === true) {
    return source
  } else if (typeof handleMeta === 'string') {
    return getSource(null, handleMeta)
  }
  return null
}

const prepareMeta = (keys, meta) => (keys)
  ? [].concat(keys)
      .filter((key) => key !== 'createdAt' && key !== 'updatedAt')
      .reduce((ret, key) =>
      ({...ret, [key]: meta[key] || null}), {})
  : prepareMeta(Object.keys(meta), meta)

/**
 * Get metadata for a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Promise} Promise of metdata
 */
async function getMeta (payload, {getSource}) {
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
  const type = 'meta'
  const id = `meta:${sourceId}`
  const source = getSource(null, sourceId)

  if (!source) {
    debug(`GET_META: Source '${sourceId}' doesn't exist`)
    return createError(`Source '${sourceId}' doesn't exist`)
  }

  const metaSource = getMetaSource(source, getSource)
  if (!metaSource) {
    return createError(`Source '${source.id}' doesn't support metadata (setting was '${source.handleMeta}')`)
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('GET_META: Get meta %s for source \'%s\' on source \'%s\' at %s',
    keys, source.id, metaSource.id, endpointDebug)

  const ret = await metaSource.retrieve({
    action: 'GET_META',
    type,
    id,
    params: {keys},
    endpoint
  })

  if (ret && ret.status === 'ok' && ret.data.length > 0) {
    const meta = prepareMeta(keys, ret.data[0].attributes)
    const data = {source: sourceId, meta}
    return {status: 'ok', data}
  }
  return ret
}

module.exports = getMeta
