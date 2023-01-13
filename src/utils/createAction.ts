import { Action, Payload, Meta } from '../types.js'

/**
 * Create an action object.
 */
export default function createAction(
  type?: string,
  payload: Payload = {},
  meta: Meta = {}
): Action | null {
  if (!type) {
    return null
  }
  return { type, payload, meta }
}
