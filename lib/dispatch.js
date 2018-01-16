const debug = require('debug')('great')
const getSource = require('./utils/getSource')

const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)))

/**
 * Setup and return dispatch function. The dispatch function will call the
 * relevant action handler.
 * @param {Object} resources - Object with actions, datatypes, sources, workers, dispatch, and queue
 * @returns {function} Dispatch function, accepting an action as only argument
 */
function setupDispatch ({actions = {}, datatypes, sources, workers, middlewares = []}) {
  let dispatch = async (action) => {
    debug('Dispatch: %o', action)

    if (action) {
      const handler = actions[action.type]

      if (typeof handler === 'function') {
        return handler(action.payload, {
          datatypes,
          sources,
          workers,
          dispatch,
          getSource: getSource(datatypes, sources)
        })
      }
    }

    return {status: 'noaction'}
  }

  if (middlewares.length > 0) {
    dispatch = compose(...middlewares)(dispatch)
  }

  return dispatch
}

module.exports = setupDispatch
