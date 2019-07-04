const debug = require('debug')('great')
import setupGetService from './utils/getService'

const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)))

const handleAction = (action, resources, actionHandlers) => {
  if (action) {
    const { type, payload = {}, meta = {} } = action
    const handler = actionHandlers[type]

    if (typeof handler === 'function') {
      return handler({ type, payload, meta }, resources)
    }
  }

  return { status: 'noaction' }
}

/**
 * Setup and return dispatch function. The dispatch function will call the
 * relevant action handler.
 * @param {Object} resources - Object with actions, schemas, services, and middlewares
 * @returns {function} Dispatch function, accepting an action as only argument
 */
function setupDispatch({
  actions: actionHandlers = {},
  schemas = {},
  services = {},
  middlewares = [],
  identOptions = {}
}) {
  const getService = setupGetService(schemas, services)

  let dispatch = async action => {
    debug('Dispatch: %o', action)
    return handleAction(
      action,
      {
        schemas,
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

export default setupDispatch
