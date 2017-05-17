const get = require('./actions/get')
const getAll = require('./actions/getAll')
const setNow = require('./actions/setNow')

/**
 * Routes the action to the relevant action handler and the relevant source.
 * If a payload includes type but no source, the correct source is added.
 * @param {Object} action - The action to route
 * @param {Object} sources - Sources object
 * @param {Object} types - Types object
 * @returns {Promise} Promise of returned data
 */
async function router (action, sources, types) {
  if (!action) {
    return null
  }

  const {type, payload = {}, source: sourceId} = action

  const sourceIdFromType = (type) => (types[type]) ? types[type].source : null
  action = {type, payload, source: sourceId || sourceIdFromType(payload.type)}

  try {
    switch (type) {
      case 'GET':
        return await get(action, sources)
      case 'GET_ALL':
        return await getAll(action, sources)
      case 'SET':
      case 'SET_NOW':
        return await setNow(action, sources)
    }
  } catch (err) {}

  return null
}

module.exports = router
