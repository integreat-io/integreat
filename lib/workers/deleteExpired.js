const action = require('../utils/createAction')
const createError = require('../utils/createError')

/**
 * Worker to delete expired items.
 *
 * The given `endpoint` is used to retrieve expired items from the `source`, and
 * may use the paramters `timestamp` or `isodate`, which represents the current
 * time plus the microseconds in `msFromNow`, the former as microseconds since
 * January 1, 1970, the latter as an ISO formatted date and time string.
 *
 * The items are mapped and typed, so the `type` param should be set to one
 * or more types expected from the `endpoint`, and may be a string or an array
 * of strings.
 * @param {Object} params - Worker params (source, type, endpoint, and msFromNow)
 * @param {Object} resources - Dispatch and queue functions
 * @returns {Object} Response object
 */
async function deleteExpired ({
  source,
  type,
  endpoint,
  msFromNow = 0
}, {dispatch, queue}) {
  if (!source) {
    return createError(`Can't delete expired without a specified source`)
  }
  if (!endpoint) {
    return createError(`Can't delete expired from source '${source}' without an endpoint`)
  }
  if (!type) {
    return createError(`Can't delete expired from source '${source}' without one or more specified types`)
  }
  const timestamp = Date.now() + msFromNow
  const isodate = new Date(timestamp).toISOString()
  const payload = {source, type, endpoint, useDefaults: false, params: {timestamp, isodate}}

  const response = await dispatch(action('GET', payload))

  if (response.status !== 'ok' || !Array.isArray(response.data)) {
    return createError(`Could not get items from source '${source}'. Reason: ${response.status} ${response.error}`, 'noaction')
  }
  if (response.data.length === 0) {
    return createError(`No items to expire from source '${source}'`, 'noaction')
  }

  const data = response.data.map((item) => ({id: item.id, type: item.type}))
  return queue(action('DELETE', {source, data}))
}

module.exports = deleteExpired
