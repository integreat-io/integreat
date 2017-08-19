const debug = require('debug')('great')
const createError = require('../../utils/createError')

const getMetaSource = (source, getSource) => {
  if (source.handleMeta === true) {
    return source
  } else if (typeof source.handleMeta === 'string') {
    return getSource(null, source.handleMeta)
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
    key,
    value,
    endpoint = 'setMeta'
  } = payload
  const source = getSource(null, sourceId)

  if (!source) {
    debug(`SET_META: No source called '${sourceId}'`)
    return createError(`No source called '${sourceId}'`)
  }

  const metaSource = getMetaSource(source, getSource)

  if (!metaSource) {
    debug(`SET_META: No meta source set for '${source.id}' (setting was '${source.handleMeta}')`)
    return {status: 'noaction'}
  }

  const data = {
    id: sourceId,
    type: 'meta',
    attributes: {
      [key]: value
    }
  }

  debug('SET_META: Send meta %s=\'%s\' for source \'%s\' on source \'%s\' at endpoint \'%s\'',
    key, value, source.id, metaSource.id, endpoint)

  return metaSource.send({
    endpoint,
    params: Object.assign({key, value}, data),
    data
  })
}

module.exports = setMeta
