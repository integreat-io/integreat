const get = require('./actions/get')
const getAll = require('./actions/getAll')
const setNow = require('./actions/setNow')

/**
 * Routes the action to the relevant action handler and the relevant source.
 * If a payload includes type but no source, the correct source is added.
 * @param {Object} action - The action to route
 * @param {Object} resources - Object with sources and types
 * @returns {Promise} Promise of returned data
 */
async function router (action, {sources, types} = {}) {
  if (!action) {
    return null
  }

  switch (action.type) {
    case 'GET':
      return await get(action, {sources, types})
    case 'GET_ALL':
      return await getAll(action, {sources, types})
    case 'SET':
    case 'SET_NOW':
      return await setNow(action, {sources, types})
  }

  return null
}

module.exports = router
