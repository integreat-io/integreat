const debug = require('debug')('great')
const setupGetService = require('./utils/getService')

const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)))

const handleAction = (action, resources, actionHandlers) => {
  if (action) {
    const {type, payload, meta = {}} = action
    const handler = actionHandlers[type]

    if (typeof handler === 'function') {
      return handler({payload, ident: meta.ident}, resources)
    }
  }

  return {status: 'noaction'}
}

/**
 * Setup and return dispatch function. The dispatch function will call the
 * relevant action handler.
 * @param {Object} resources - Object with actions, datatypes, services, and middlewares
 * @returns {function} Dispatch function, accepting an action as only argument
 */
function setupDispatch ({actions: actionHandlers = {}, datatypes = {}, services = {}, middlewares = [], identOptions = {}}) {
  const getService = setupGetService(datatypes, services)

  let dispatch = async (action) => {
    debug('Dispatch: %o', action)
    return handleAction(
      action,
      {
        datatypes,
        services,
        dispatch,
        identOptions,
        getService
      },
      actionHandlers
    )
  }

  if (middlewares.length > 0) {
    dispatch = compose(...middlewares)(dispatch)
  }

  return dispatch
}

module.exports = setupDispatch
