const get = require('./get')

/**
 * Routes the action to the relevant action handler.
 * @param {Object} action - The action to route
 * @param {function} getSource - Function to retrieve a source
 * @returns {Promise} Promise of returned data
 */
async function actionHandler (action, getSource) {
  if (!action) {
    return null
  }

  try {
    switch (action.type) {
      case 'GET':
        return await get(action, getSource)
    }
  } catch (err) {
    return null
  }
}

module.exports = actionHandler
