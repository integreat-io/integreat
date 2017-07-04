/**
 * Worker to sync from one source to another
 * @param {Object} params - Worker params (from, to, type, and retrieve)
 * @param {function} dispatch - Dispatch function
 * @returns {Promise} Promise of the worker result
 */
async function sync ({from, to, type}, dispatch) {
  const {data} = await dispatch({type: 'GET_ALL', source: from, payload: {type}})

  if (Array.isArray(data)) {
    return Promise.all(data.map((payload) => {
      return dispatch({type: 'SET', source: to, payload})
    }))
  }
}

module.exports = sync
