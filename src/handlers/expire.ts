import { createErrorResponse } from '../utils/response.js'
import { isTypedData } from '../utils/is.js'
import type {
  Action,
  Response,
  HandlerDispatch,
  Ident,
  TypedData,
  ActionHandlerResources,
} from '../types.js'

const isTypedDataArray = (value: unknown): value is TypedData[] =>
  Array.isArray(value) && isTypedData(value[0])

const getOrDeleteExpired = async (
  deleteWithParams: boolean,
  dispatch: HandlerDispatch,
  type: string | string[],
  msFromNow: number,
  targetService?: string,
  endpointId?: string,
  cid?: string,
  ident?: Ident,
): Promise<Response> => {
  const timestamp = Date.now() + msFromNow
  const isodate = new Date(timestamp).toISOString()
  return dispatch({
    type: deleteWithParams ? 'DELETE' : 'GET',
    payload: {
      type,
      timestamp,
      isodate,
      ...(targetService && { targetService }),
      ...(endpointId && { endpoint: endpointId }),
    },
    meta: { ident, cid, ...(deleteWithParams ? { queue: true } : {}) },
  })
}

const deleteExpiredItems = async (
  dispatch: HandlerDispatch,
  type: string | string[],
  data: TypedData[],
  targetService?: string,
  cid?: string,
  ident?: Ident,
): Promise<Response> => {
  const deleteData = data.map((item) => ({ id: item.id, $type: item.$type }))
  const deleteAction = {
    type: 'DELETE',
    payload: {
      type,
      data: deleteData,
      ...(targetService && { targetService }),
    },
    meta: { ident, queue: true, cid },
  }

  return await dispatch(deleteAction)
}

/**
 * Action to delete expired items.
 *
 * When `deleteWithParams` is `false` or not set, we'll first `GET` all expired
 * items, and then send the response data to a `DELETE` action. The `GET` action
 * is sent with the paramters `timestamp` and `isodate`, which represents the
 * current time plus the microseconds in `msFromNow`, the former as microseconds
 * since January 1, 1970, the latter as an ISO formatted date and time string.
 * If an `endpoint` is specified, it will be passed with the `GET` action.
 *
 * When `deleteWithParams` is `true`, we'll just send a `DELETE` action, but
 * with the `timestamp` and `isodate` params and no data. If an `endpoint` is
 * specified, it will be passed with the `DELETE` action.
 */
export default async function expire(
  action: Action,
  { dispatch }: ActionHandlerResources,
): Promise<Response> {
  const {
    payload: {
      type,
      endpoint: endpointId,
      targetService: serviceId,
      deleteWithParams = false,
    },
    meta: { ident, cid } = {},
  } = action
  const msFromNow = (action.payload.msFromNow as number) || 0

  if (!type) {
    return createErrorResponse(
      `Can't delete expired from service '${serviceId}' without one or more specified types`,
      'handler:EXPIRE',
      'badrequest',
    )
  }

  const expiredResponse = await getOrDeleteExpired(
    !!deleteWithParams,
    dispatch,
    type,
    msFromNow,
    serviceId,
    endpointId,
    cid,
    ident,
  )

  if (deleteWithParams) {
    // We're deleting directly with params, so we're done
    return expiredResponse
  }

  if (expiredResponse.status !== 'ok') {
    return createErrorResponse(
      `Could not get items from service '${serviceId}'. Reason: ${expiredResponse.status} ${expiredResponse.error}`,
      'handler:EXPIRE',
    )
  }
  const data = expiredResponse.data
  if (!isTypedDataArray(data)) {
    return createErrorResponse(
      `No items to expire from service '${serviceId}'`,
      'handler:EXPIRE',
      'noaction',
    )
  }

  return await deleteExpiredItems(dispatch, type, data, serviceId, cid, ident)
}
