import { isInternalIdent } from './is.js'
import { setResponseOnAction } from './action.js'
import type { Action, Response, HandlerDispatch, Ident } from '../types.js'
import { createErrorResponse } from './response.js'

const createGetIdentAction = (ident: Ident) => ({
  type: 'GET_IDENT',
  payload: {},
  meta: { ident, cache: true },
})

// Return true if we should try and complete the ident. Basically, try and
// complete any ident that has an id or withToken property, is not already
// completed, and is not an internal type.
const isIdentCompletable = (ident?: Ident): ident is Ident =>
  !!ident &&
  !!(ident.id || ident.withToken) &&
  !ident.isCompleted &&
  !isInternalIdent(ident)

/**
 * Completes the identity of the given action.
 *
 * This is done by dispatching a 'GET_IDENT' action to the next middleware, and
 * then setting the retrieved ident item on the action. If an ident item cannot
 * be found or the request results in an error, an error response is set on the
 * action.
 */
export async function completeIdent(
  originalIdent: Ident | undefined,
  dispatch: HandlerDispatch,
): Promise<Response> {
  if (!isIdentCompletable(originalIdent)) {
    return { status: 'ok', access: { ident: originalIdent } }
  }

  const response = await dispatch(createGetIdentAction(originalIdent))

  if (response.status === 'ok') {
    const ident = response?.access?.ident || originalIdent
    return { status: 'ok', access: { ident } }
  } else if (response.status === 'notfound') {
    return createErrorResponse(
      `Ident '${originalIdent.id}' was not found. [${response.status}] ${response.error}`,
      'auth:ident',
      'noaccess',
      'unknownident',
    )
  } else {
    return createErrorResponse(
      `Could not fetch ident '${originalIdent.id}'. [${response.status}] ${response.error}`,
      'auth:ident',
      'autherror',
    )
  }
}

export async function completeIdentOnAction(
  action: Action,
  dispatch: HandlerDispatch,
): Promise<Action> {
  const originalIdent = action.meta?.ident
  const response = await completeIdent(originalIdent, dispatch)
  if (response.status === 'ok') {
    const ident = response?.access?.ident
    return { ...action, meta: { ...action.meta, ident } }
  } else {
    return setResponseOnAction(action, response)
  }
}
