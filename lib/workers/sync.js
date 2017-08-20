const action = require('../utils/createAction')

const setUpdatedAfterParam = async (params, source, dispatch) => {
  const {data} = await dispatch(action('GET_META', {source, keys: 'lastSyncedAt'}))
  if (data.meta && data.meta.lastSyncedAt) {
    params.updatedAfter = data.meta.lastSyncedAt
  }
}

const isUpdatedAfter = (date) => (item) => !date || !item.updatedAt || item.updatedAt > date

/**
 * Worker to sync from one source to another
 * @param {Object} params - Worker params (from, to, type, and retrieve)
 * @param {Object} resources - Dispatch and queue functions
 * @returns {Promise} Promise of the worker result
 */
async function sync ({from, to, type, retrieve}, {dispatch, queue}) {
  let params = {}
  if (retrieve === 'updated') {
    setUpdatedAfterParam(params, from, dispatch)
  }

  const lastSyncedAt = new Date()
  const {data} = await dispatch(action('GET', {source: from, type, params}))

  if (Array.isArray(data) && data.length > 0) {
    return Promise.all([
      dispatch(action('SET_META', {source: from, meta: {lastSyncedAt}}))
    ].concat(
      data
        .filter(isUpdatedAfter(params.updatedAfter))
        .map((data) => queue(action('SET_ONE', {source: to, data})
    ))))
  }
}

module.exports = sync
