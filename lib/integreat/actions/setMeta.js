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
 * Set metadata on a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Promise} Promise that will be resolved when metadata is set
 */
async function setMeta (payload, {getSource}) {
  debug('Action: SET_META')

  if (!payload) {
    debug('SET_META: No payload')
    return createError('No payload')
  }

  const {
    source: sourceId,
    meta,
    endpoint = 'setMeta'
  } = payload
  const source = getSource(null, sourceId)

  if (!source) {
    debug(`SET_META: Source '${sourceId}' doesn't exist`)
    return createError(`Source '${sourceId}' doesn't exist`)
  }

  const metaSource = getMetaSource(source, getSource)

  if (!metaSource) {
    debug(`SET_META: No meta source set for '${source.id}' (setting was '${source.handleMeta}')`)
    return {status: 'noaction'}
  }

  const data = {
    id: sourceId,
    type: 'meta',
    attributes: meta
  }

  debug('SET_META: Send metadata %o for source \'%s\' on source \'%s\' at endpoint \'%s\'',
    meta, source.id, metaSource.id, endpoint)

  return metaSource.send({
    endpoint,
    params: Object.assign({keys: Object.keys(meta)}, data),
    data
  })
}

module.exports = setMeta
