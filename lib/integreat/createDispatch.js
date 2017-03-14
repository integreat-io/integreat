function createDispatch (actionHandler, getSource) {
  if (typeof actionHandler !== 'function') {
    throw TypeError('Missing actionHandler function')
  }

  if (typeof getSource !== 'function') {
    throw TypeError('Missing getSource function')
  }

  return (action) => {
    actionHandler(action, getSource)
  }
}

module.exports = createDispatch
