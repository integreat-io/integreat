const debug = require('debug')('great')

/**
 * Get one item from a source, based on the given payload.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Object} One data object from the source
 */
async function getOne (payload, {getSource} = {}) {
  debug('Action: GET_ONE')
  if (!payload) {
    debug('GET_ONE: No payload')
    return {status: 'error', error: 'No payload'}
  }

  const {
    id,
    type,
    source: sourceId,
    endpoint = 'getOne',
    params = {},
    mappedValuesOnly
  } = payload
  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null

  if (!source) {
    debug('GET_ONE: No source')
    return {status: 'error', error: 'No source'}
  }

  debug('GET_ONE: Fetch from source %s at endpoint %s \'%s\'', source.id, endpoint)
  const ret = await source.retrieve({
    endpoint,
    params: Object.assign({id, type}, params),
    type,
    mappedValuesOnly
  })

  if (Array.isArray(ret.data)) {
    const data = (ret.data.length === 0) ? null : ret.data[0]
    return Object.assign({}, ret, {data})
  }
  return ret
}

module.exports = getOne
