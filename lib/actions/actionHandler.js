const get = require('./get')

function actionHandler (action, getSource) {
  if (!action) {
    return
  }

  switch (action.type) {
    case 'GET':
      get(action, getSource)
  }
}

module.exports = actionHandler
