const get = require('./get')
const getAll = require('./getAll')

/**
 * Routes the action to the relevant action handler.
 * @param {Object} action - The action to route
 * @param {Sources} sources - Sources object
 * @returns {Promise} Promise of returned data
 */
async function actionHandler (action, sources) {
  if (!action) {
    return null
  }

  try {
    switch (action.type) {
      case 'GET':
        return await get(action, sources)
      case 'GET_ALL':
        return await getAll(action, sources)
    }
  } catch (err) {
    return null
  }
}

module.exports = actionHandler
