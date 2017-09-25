const action = require('../utils/createAction')

const setUpdatedAfterParam = async (params, source, dispatch) => {
  const {data} = await dispatch(action('GET_META', {source, keys: 'lastSyncedAt'}))
  if (data.meta && data.meta.lastSyncedAt) {
    params.updatedAfter = data.meta.lastSyncedAt
  }
}

const isUpdatedAfter = (date) => (item) => !date || !item.updatedAt || item.updatedAt > date

/**
 * Worker to sync from one source to another.
 *
 * `retrieve` indicates which items to retrieve. The default is `all`, which
 * will retrieve all items from the `get` endpoint. Set `retrieve` to `updated`
 * to retrieve only items that are updated after the  `lastSyncedAt` date for
 * the `from` source. This is done by passing the `lastSyncedAt` date as a
 * parameter named `updatedAfter` to the `get` endpoint, and by actively
 * filter away any items received with `updatedAt` earlier than `lastSyncedAt`.
 *
 * The `lastSyncedAt` metadata will be set on the `from` source when items
 * are retrieved and updated.
 * @param {Object} params - Worker params (from, to, type, and retrieve)
 * @param {Object} resources - Dispatch and queue functions
 * @returns {Promise} Promise of the worker result
 */
async function sync ({from, to, type, retrieve}, {dispatch, queue}) {
  let params = {}
  if (retrieve === 'updated') {
    await setUpdatedAfterParam(params, from, dispatch)
  }

  const lastSyncedAt = new Date()
  let {data} = await dispatch(action('GET', {source: from, type, params}))

  if (Array.isArray(data)) {
    if (params.updatedAfter) {
      data = data.filter(isUpdatedAfter(params.updatedAfter))
    }

    if (data.length > 0) {
      return Promise.all([
        dispatch(action('SET_META', {source: from, meta: {lastSyncedAt}}))
      ].concat(
        data
          .map((data) => queue(action('SET_ONE', {source: to, data})
      ))))
    }
  }
}

module.exports = sync
