const action = require('../utils/createAction')

/**
 * Worker to sync from one source to another
 * @param {Object} params - Worker params (from, to, type, and retrieve)
 * @param {Object} resources - Dispatch and queue functions
 * @returns {Promise} Promise of the worker result
 */
async function sync ({from, to, type}, {dispatch, queue}) {
  const {data} = await dispatch(action('GET', {source: from, type}))

  if (Array.isArray(data)) {
    return Promise.all(data.map((data) => queue(
      action('SET_ONE', {source: to, data})
    )))
  }
}

module.exports = sync
