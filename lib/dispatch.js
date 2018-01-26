const debug = require('debug')('great')
const getSource = require('./utils/getSource')

const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)))

/**
 * Setup and return dispatch function. The dispatch function will call the
 * relevant action handler.
 * @param {Object} resources - Object with actions, datatypes, sources, and middlewares
 * @returns {function} Dispatch function, accepting an action as only argument
 */
function setupDispatch ({actions = {}, datatypes, sources, middlewares = []}) {
  let dispatch = async (action) => {
    debug('Dispatch: %o', action)

    if (action) {
      const {type, payload, meta = {}} = action
      const handler = actions[type]

      if (typeof handler === 'function') {
        return handler(payload, {
          datatypes,
          sources,
          dispatch,
          ident: meta.ident,
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
