import { nanoid } from 'nanoid'
import { createErrorResponse, setOrigin } from './response.js'
import type { Action, Payload, Meta, Response } from '../types.js'
import type Endpoint from '../service/Endpoint.js'

/**
 * Create an action object.
 */
export function createAction(
  type?: string,
  payload: Payload = {},
  meta: Meta = {},
): Action | null {
  if (!type) {
    return null
  }
  return { type, payload, meta }
}

/**
 * Set payload data on given action.
 */
export function setDataOnActionPayload(action: Action, data?: unknown) {
  return {
    ...action,
    payload: { ...action.payload, data },
  }
}

/**
 * Set response on given action.
 */
export function setResponseOnAction(action: Action, response?: Response) {
  return { ...action, response: response || {} }
}

export function setMetaOnAction(
  action: Action,
  { queue, queuedAt, id, ...meta }: Meta,
) {
  return {
    ...action,
    meta: {
      ...meta,
      ...((action.meta?.queue ?? queue) ? { queue: true } : {}),
    },
  }
}

/**
 * Set the general options from an endpoint on `action.meta.options`.
 */
export function setOptionsOnAction(action: Action, endpoint: Endpoint): Action {
  return {
    ...action,
    meta: { ...action.meta, options: endpoint?.options.transporter || {} },
  }
}

/**
 * Set error message and status on an action.
 */
export function setErrorOnAction(
  action: Action,
  error: unknown,
  origin?: string,
  status = 'error',
): Action {
  return setResponseOnAction(action, {
    ...action.response,
    ...createErrorResponse(error, origin, status),
  })
}

/**
 * Set the given origin on the response of an action, if the response status is
 * not ok and there is not an origin already specified.
 * If `doPrefix` is true, any existing origin will be prefixed with the given
 * origin.
 */
export const setOriginOnAction = (
  action: Action,
  origin: string,
  doPrefix = false,
) =>
  typeof action.response?.status === 'string' ||
  typeof action.response?.error === 'string' // There are more cases here, but they are handled in `setOrigin`
    ? { ...action, response: setOrigin(action.response, origin, doPrefix) }
    : action

const hasIdAndCid = (action: Action) => action.meta?.id && action.meta.cid

/**
 * Set `id` and `cid` on action if it is not already set. When `id` is set, but
 * no `cid`, the `id` is used for `cid`.
 */
export function setActionIds(action: Action) {
  if (!hasIdAndCid(action)) {
    const id = action.meta?.id ?? nanoid()
    const cid = action.meta?.cid ?? id
    return { ...action, meta: { ...action.meta, id, cid } }
  }

  // Fallback to returning the action untouched
  return action
}
