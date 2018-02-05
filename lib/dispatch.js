const debug = require('debug')('great')
const setupGetSource = require('./utils/getSource')

const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)))

/**
 * Setup and return dispatch function. The dispatch function will call the
 * relevant action handler.
 * @param {Object} resources - Object with actions, datatypes, sources, and middlewares
 * @returns {function} Dispatch function, accepting an action as only argument
 */
function setupDispatch ({actions = {}, datatypes = {}, sources = {}, middlewares = [], identOptions = {}}) {
  const getSource = setupGetSource(datatypes, sources)

  const dispatch = async (action) => {
    debug('Dispatch: %o', action)

    if (action) {
      const {type, payload, meta = {}} = action
      const handler = actions[type]

      if (typeof handler === 'function') {
        return handler({payload, ident: meta.ident}, {
          datatypes,
          sources,
          dispatch,
          identOptions,
          getSource
        })
      }
    }

    return {status: 'noaction'}
  }

  if (middlewares.length > 0) {
    return compose(...middlewares)(dispatch)
  }

  return dispatch
}

module.exports = setupDispatch
