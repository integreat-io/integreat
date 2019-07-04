const action = require('../utils/createAction')
const createError = require('../utils/createError')

const getExpired = async (payload, ident, dispatch) => {
  const {
    service,
    type,
    endpoint,
    msFromNow = 0
  } = payload

  const timestamp = Date.now() + msFromNow
  const isodate = new Date(timestamp).toISOString()
  const payloadGet = { service, type, endpoint, onlyMappedValues: true, timestamp, isodate }

  return dispatch(action('GET', payloadGet, { ident }))
}

const deleteExpired = async (response, service, ident, dispatch) => {
  if (response.status !== 'ok' || !Array.isArray(response.data)) {
    return createError(`Could not get items from service '${service}'. Reason: ${response.status} ${response.error}`, 'noaction')
  }
  if (response.data.length === 0) {
    return createError(`No items to expire from service '${service}'`, 'noaction')
  }

  const data = response.data.map((item) =>
    ({ id: item.id, type: item.type }))

  return dispatch(action(
    'DELETE',
    { service, data },
    { queue: true, ident }
  ))
}

/**
 * Action to delete expired items.
 *
 * The given `endpoint` is used to retrieve expired items from the `service`, and
 * may use the paramters `timestamp` or `isodate`, which represents the current
 * time plus the microseconds in `msFromNow`, the former as microseconds since
 * January 1, 1970, the latter as an ISO formatted date and time string.
 *
 * The items are mapped and typed, so the `type` param should be set to one
 * or more types expected from the `endpoint`, and may be a string or an array
 * of strings.
 * @param {Object} payload - Action payload (service, type, endpoint, and msFromNow)
 * @param {Object} resources - Dispatch and queue functions
 * @returns {Object} Response object
 */
async function expire ({ payload, meta = {} }, { dispatch }) {
  const { service } = payload
  const { ident } = meta

  if (!service) {
    return createError(`Can't delete expired without a specified service`)
  }
  if (!payload.endpoint) {
    return createError(`Can't delete expired from service '${service}' without an endpoint`)
  }
  if (!payload.type) {
    return createError(`Can't delete expired from service '${service}' without one or more specified types`)
  }

  const response = await getExpired(payload, ident, dispatch)

  return deleteExpired(response, service, ident, dispatch)
}

module.exports = expire
