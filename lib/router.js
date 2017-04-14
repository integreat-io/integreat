const get = require('./actions/get')
const getAll = require('./actions/getAll')
const setNow = require('./actions/setNow')

const ensurePayload = (action) => {
  const payload = Object.assign({}, action.payload)
  return Object.assign({}, action, {payload})
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
  action = ensurePayload(action)

  const source = (action.source)
    ? sources.get(action.source)
    : sources.getFromType(action.payload.type)

  try {
    switch (action.type) {
      case 'GET':
        return await get(action, source)
      case 'GET_ALL':
        return await getAll(action, source)
      case 'SET':
      case 'SET_NOW':
        return await setNow(action, source)
    }
  } catch (err) {}

  return null
}

module.exports = router
