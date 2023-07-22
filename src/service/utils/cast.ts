import type Endpoint from '../Endpoint.js'
import type { DataMapperEntry } from 'map-transform/types.js'
import type { Action } from '../../types.js'

export const getCastFn = (
  castFns: Record<string, DataMapperEntry>,
  type?: string | string[]
) =>
  typeof type === 'string'
    ? castFns[type] // eslint-disable-line security/detect-object-injection
    : undefined

export const castPayload = (
  action: Action,
  endpoint: Endpoint,
  castFn?: DataMapperEntry
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
  castFn?: DataMapperEntry
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
