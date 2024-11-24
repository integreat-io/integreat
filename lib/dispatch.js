const { nanoid } = require('nanoid')
const debug = require('debug')('great')
const PProgress = require('p-progress')
const setupGetService = require('./utils/getService')

const compose = (...fns) =>
  fns.reduce(
    (f, g) =>
      (...args) =>
        f(g(...args))
  )

const handleAction = (action, resources, actionHandlers) => {
  if (action) {
    const { type, payload = {}, meta = {} } = action
    const handler = actionHandlers[type]

    if (typeof handler === 'function') {
      return handler({ type, payload, meta }, resources)
    }
  }

  return PProgress.resolve({ status: 'noaction' })
}

function setIds(action) {
  if (!action) {
    return action
  }
  const meta = action.meta || {}
  const id = meta.id || nanoid()
  const cid = meta.cid || id
  const gid = meta.gid || id
  return { ...action, meta: { ...meta, id, cid, gid } }
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
  identOptions = {},
}) {
  const getService = setupGetService(schemas, services)
  const middlewareFn =
    middlewares.length > 0
      ? compose(...middlewares)
      : (next) => async (action) => next(action)

  const dispatch = (action) => {
    return new PProgress(async (resolve, reject, setProgress) => {
      debug('Dispatch: %o', action)

      try {
        resolve(
          middlewareFn((action) =>
            handleAction(
              action,
              {
                schemas,
                services,
                dispatch,
                identOptions,
                getService,
                setProgress,
              },
              actionHandlers
            )
          )(setIds(action))
        )
      } catch (err) {
        reject(err)
      }
    })
  }

  return dispatch
}

module.exports = setupDispatch
