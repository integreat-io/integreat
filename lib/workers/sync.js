function sync (dispatch) {
  return async ({source, target, type}) => {
    const {data} = await dispatch({type: 'GET_ALL', source, payload: {type}})

    if (Array.isArray(data)) {
      return Promise.all(data.map((payload) => {
        return dispatch({type: 'SET', source: target, payload})
      }))
    }
  }
}

module.exports = sync
