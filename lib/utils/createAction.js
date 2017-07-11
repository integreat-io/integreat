/**
 * Create an action object.
 * @param {string} type - The action type
 * @param {Object} payload - The payload of the action
 * @param {Object} props - Other action properties
 * @returns {Object} An action object
 */
function createAction (type, payload, props = {}) {
  return (type)
    ? Object.assign({
      type,
      payload
    }, props)
    : null
}

module.exports = createAction
