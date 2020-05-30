import { Action, Payload, ActionMeta } from '../types'

/**
 * Create an action object.
 */
export default function createAction(
  type?: string,
  payload: Payload = {},
  meta: ActionMeta = {}
): Action | null {
  if (!type) {
    return null
  }
  return { type, payload, meta }
}
