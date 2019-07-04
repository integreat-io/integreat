const getIdent = async (ident, dispatch) => {
  const response = await dispatch({
    type: 'GET_IDENT',
    payload: {},
    meta: { ident }
  })

  return (response.status === 'ok')
    ? response.access && response.access.ident
    : null
}

const isIdentGetable = (ident) => ident && (ident.id || ident.withToken)

/**
 * Middleware that will complete the identity of the dispatched action.
 *
 * This is done by dispatching a 'GET_IDENT' action to the next middleware, and
 * and then setting the retrieved ident item on the action before passing it
 * on to the next middleware. If an ident item cannot be found or the request
 * results in an error, the original action will simply be passed on.
 *
 * As the 'GET_IDENT' action is not passed to the entire middleware chain, but
 * only to the middlewares after this one, you should take care when you decide
 * on the order of middlewares. E.g., by placing completeIdent before any
 * caching middleware, you'll get caching of ident items for free. It is also
 * good practice to place it after any queueing middleware, so that the ident
 * completion happens when the action is pulled from the queue. This way, you
 * make sure that the ident has not lost it's permissions between queueing and
 * final dispatch.
 *
 * @param {function} next - The next middleware
 * @returns {function} The middleware function, accepting an action as only arg
 */
const completeIdent = (next) => async (action) => {
  const { meta = {} } = action

  if (isIdentGetable(meta.ident)) {
    const ident = await getIdent(meta.ident, next)

    if (ident) {
      action = { ...action, meta: { ...meta, ident } }
    }
  }

  return next(action)
}

export default completeIdent
