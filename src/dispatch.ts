import debugLib = require('debug')
import setupGetService from './utils/getService'

const debug = debugLib('great')

const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)))

const handleAction = (action, resources, actionHandlers) => {
  if (action) {
    const { type, payload = {}, meta = {} } = action
    const handler = actionHandlers[type] // eslint-disable-line security/detect-object-injection

    if (typeof handler === 'function') {
      return handler({ type, payload, meta }, resources)
    }
  }

  return { status: 'noaction' }
}

/**
 * Setup and return dispatch function. The dispatch function will call the
 * relevant action handler.
 * @param resources - Object with actions, schemas, services, and middlewares
 * @returns Dispatch function, accepting an action as only argument
 */
function setupDispatch({
  actions: actionHandlers = {},
  schemas = {},
  services = {},
  middlewares = [],
  identConfig = {}
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
        identConfig,
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
