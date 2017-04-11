const get = require('./actions/get')
const getAll = require('./actions/getAll')

const addSourceToPayload = (action, types) => {
  const {payload} = action
  if (!payload.type || payload.source) {
    return action
  }

  const source = types.get(payload.type)

  return Object.assign({}, action, {
    payload: Object.assign({}, payload, {source})
  })
}

/**
 * Routes the action to the relevant action handler and the relevant source.
 * If a payload includes type but no source, the correct source is added.
 * @param {Object} action - The action to route
 * @param {Sources} sources - Sources object
 * @returns {Promise} Promise of returned data
 */
async function router (action, sources) {
  if (!action) {
    return null
  }

  action = addSourceToPayload(action, sources.types)
  const source = sources.get(action.payload.source)

  try {
    switch (action.type) {
      case 'GET':
        return await get(action, source)
      case 'GET_ALL':
        return await getAll(action, source)
    }
  } catch (err) {
    return null
  }
}

module.exports = router
