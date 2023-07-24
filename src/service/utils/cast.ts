import type Endpoint from '../Endpoint.js'
import type { CastFn } from '../../schema/types.js'
import type { Action } from '../../types.js'

export const getCastFn = (
  castFns: Map<string, CastFn>,
  type?: string | string[]
) => (typeof type === 'string' ? castFns.get(type) : undefined)

export const castPayload = (
  action: Action,
  endpoint: Endpoint,
  castFn?: CastFn
): Action => ({
  ...action,
  payload:
    !endpoint.allowRawRequest && castFn
      ? {
          ...action.payload,
          data: castFn(action.payload.data),
        }
      : action.payload,
  meta: { ...action.meta, options: endpoint.options.transporter || {} },
})

export const castResponse = (
  action: Action,
  endpoint: Endpoint,
  castFn?: CastFn
): Action =>
  !endpoint.allowRawResponse && castFn
    ? {
        ...action,
        response: {
          ...action.response,
          data: castFn(action.response?.data),
        },
      }
    : action
