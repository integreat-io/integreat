const debug = require('debug')('great')
const action = require('../utils/createAction')
const createError = require('../utils/createError')

const setUpdatedAfterParam = async (params, service, dispatch, ident) => {
  const { status, data, error } = await dispatch(action('GET_META', { service, keys: 'lastSyncedAt' }, { ident }))
  if (status === 'ok' && data && data.meta && data.meta.lastSyncedAt) {
    params.updatedAfter = data.meta.lastSyncedAt
  } else {
    debug('SYNC: Could not get meta for service %s. Error: %s %s', service, status, error)
  }
}

const isUpdatedAfter = (date) => (item) =>
  !date || !item.attributes.updatedAt || item.attributes.updatedAt > date

/**
 * Action to sync from one service to another.
 *
 * `retrieve` indicates which items to retrieve. The default is `all`, which
 * will retrieve all items from the `get` endpoint. Set `retrieve` to `updated`
 * to retrieve only items that are updated after the  `lastSyncedAt` date for
 * the `from` service. This is done by passing the `lastSyncedAt` date as a
 * parameter named `updatedAfter` to the `get` endpoint, and by actively
 * filter away any items received with `updatedAt` earlier than `lastSyncedAt`.
 *
 * The `lastSyncedAt` metadata will be set on the `from` service when items
 * are retrieved and updated.
 * @param {Object} payload - Action payload (from, to, type, and retrieve)
 * @param {Object} resources - Dispatch function
 * @returns {Promise} Promise of the action result
 */
async function sync ({ payload, meta = {} }, { dispatch }) {
  debug('Action: SYNC')
  const { from, to, type, retrieve, toParams } = payload
  const { ident } = meta
  const fromParams = { ...payload.fromParams }
  if (retrieve === 'updated') {
    await setUpdatedAfterParam(fromParams, from, dispatch, ident)
  }

  const lastSyncedAt = new Date()
  const response = await dispatch(action('GET', { service: from, type, ...fromParams }, { ident }))
  let { data } = response

  if (response.status !== 'ok' || !Array.isArray(data)) {
    return createError(`Could not get items from service '${from}'. Reason: ${response.status} ${response.error}`, 'noaction')
  }

  if (fromParams.updatedAfter) {
    data = data.filter(isUpdatedAfter(fromParams.updatedAfter))
  }

  if (data.length === 0) {
    return createError(`No items to update from service '${from}'`, 'noaction')
  }

  return Promise.all([
    dispatch(action('SET_META', { service: from, meta: { lastSyncedAt } }, { ident })),
    dispatch(action('SET', { service: to, data, ...toParams }, { queue: true, ident }))
  ])
    .then((responses) => {
      return { status: 'ok', data: responses }
    })
}

module.exports = sync
