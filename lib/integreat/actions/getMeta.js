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
    key,
    endpoint = 'getMeta'
  } = payload
  const type = 'meta'
  const source = getSource(null, sourceId)

  if (!source) {
    debug(`GET_META: Source '${sourceId}' doesn't exist`)
    return createError(`Source '${sourceId}' doesn't exist`)
  }

  const metaSource = getMetaSource(source, getSource)
  if (!metaSource) {
    return createError(`Source '${source.id}' doesn't support metadata (setting was '${source.handleMeta}')`)
  }

  const params = {id: sourceId, type, key}

  debug('GET_META: Get meta %s for source \'%s\' on source \'%s\' at endpoint \'%s\'',
    key, source.id, metaSource.id, endpoint)

  const ret = await metaSource.retrieve({
    endpoint,
    params,
    type
  })

  if (ret && ret.status === 'ok') {
    const attrs = ret.data[0].attributes
    const data = {source: sourceId, key, value: attrs[key] || null}
    return {status: 'ok', data}
  }
  return ret
}

module.exports = getMeta
