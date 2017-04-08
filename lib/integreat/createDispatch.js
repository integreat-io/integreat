/**
 * Create a dispatch function to pass along to components needing to trigger
 * actions.
 * @param {function} actionHandler - Function to handle the actions
 * @param {function} getSource - Function to retrieve a source
 * @returns {Promise} - Promise of returned data
 */
function createDispatch (actionHandler, getSource) {
  if (typeof actionHandler !== 'function') {
    throw TypeError('createDispatch: Missing actionHandler function')
  }

  if (typeof getSource !== 'function') {
    throw TypeError('createDispatch: Missing getSource function')
  }

  const dispatch = async (action) => await actionHandler(action, getSource)
  return dispatch
}

module.exports = createDispatch
