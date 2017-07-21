const action = require('../utils/createAction')

/**
 * Worker to sync from one source to another
 * @param {Object} params - Worker params (from, to, type, and retrieve)
 * @param {function} dispatch - Dispatch function
 * @returns {Promise} Promise of the worker result
 */
async function sync ({from, to, type}, dispatch) {
  const {data} = await dispatch(action('GET', {source: from, type}))

  if (Array.isArray(data)) {
    return Promise.all(data.map((data) => dispatch(
      action('SET', {source: to, data}, {queue: true})
    )))
  }
}

module.exports = sync
