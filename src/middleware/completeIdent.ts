import { completeIdentOnAction } from '../utils/completeIdent.js'
import type { Middleware } from '../types.js'

/**
 * Middleware that will complete the identity of the dispatched action.
 *
 * This is done by dispatching a 'GET_IDENT' action to the next middleware, and
 * and then setting the retrieved ident item on the action before passing it
 * on to the next middleware. If an ident item cannot be found or the request
 * results in an error, the original action will simply be passed on.
 *
 * As the 'GET_IDENT' action is not passed to the entire middleware chain, but
 * only to the middleware after this one, you should take care to place it at
 * the right point among the middleware. E.g., by placing completeIdent before
 * any caching middleware, you'll get caching of ident items for free. It is
 * also good practice to place it after any queueing middleware, so that the
 * ident completion happens when the action is pulled from the queue. This way,
 * you make sure that the ident has not lost it's permissions between queueing
 * and final dispatch.
 */
const completeIdent: Middleware = (next) => async (action) => {
  const completedAction = await completeIdentOnAction(action, next)
  return await next(completedAction)
}

export default completeIdent
