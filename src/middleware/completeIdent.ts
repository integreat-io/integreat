import { completeExchange } from '../utils/exchangeMapping'
import { InternalDispatch, Middleware, Ident } from '../types'

const getIdent = async (ident: Ident, dispatch: InternalDispatch) => {
  const response = await dispatch(
    completeExchange({
      type: 'GET_IDENT',
      ident,
    })
  )

  return response.status === 'ok' ? response?.ident : undefined
}

const isIdentGetable = (ident?: Ident): ident is Ident =>
  Boolean(ident?.id || ident?.withToken)

/**
 * Middleware that will complete the identity of the dispatched action.
 *
 * This is done by dispatching a 'GET_IDENT' action to the next middleware, and
 * and then setting the retrieved ident item on the action before passing it
 * on to the next middleware. If an ident item cannot be found or the request
 * results in an error, the original action will simply be passed on.
 *
 * As the 'GET_IDENT' action is not passed to the entire middleware chain, but
 * only to the middleware after this one, you should take care when you decide
 * on the order of middleware. E.g., by placing completeIdent before any
 * caching middleware, you'll get caching of ident items for free. It is also
 * good practice to place it after any queueing middleware, so that the ident
 * completion happens when the action is pulled from the queue. This way, you
 * make sure that the ident has not lost it's permissions between queueing and
 * final dispatch.
 */
const completeIdent: Middleware = (next) => async (exchange) => {
  if (isIdentGetable(exchange.ident)) {
    const ident = await getIdent(exchange.ident, next)

    if (ident) {
      exchange = { ...exchange, ident }
    }
  }

  return next(exchange)
}

export default completeIdent
