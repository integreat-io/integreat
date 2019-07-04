/**
 * Create an action object.
 * @param {string} type - The action type
 * @param {Object} payload - The payload of the action
 * @param {Object} props - Other action properties
 * @returns {Object} An action object
 */
function createAction (type, payload = {}, meta) {
  if (!type) {
    return null
  }

  const action = { type, payload }
  if (meta) {
    action.meta = meta
  }
  return action
}

export default createAction
