import { createErrorResponse } from '../utils/response.js'
import { isTypedData } from '../utils/is.js'
import type {
  Action,
  Response,
  HandlerDispatch,
  Meta,
  TypedData,
  ActionHandlerResources,
} from '../types.js'

const isTypedDataArray = (value: unknown): value is TypedData[] =>
  Array.isArray(value) && isTypedData(value[0])

const createDeleteAction = (
  type: string | string[],
  data: TypedData[],
  params: Record<string, unknown>,
  { ident, cid, gid }: Meta,
  targetService?: string,
) => ({
  type: 'DELETE',
  payload: {
    ...params,
    type,
    data,
    ...(targetService && { targetService }),
  },
  meta: { ident, queue: true, cid, ...(gid && { gid }) },
})

const getOrDeleteExpired = async (
  deleteWithParams: boolean,
  dispatch: HandlerDispatch,
  type: string | string[],
  msFromNow: number,
  params: Record<string, unknown>,
  { ident, cid, gid }: Meta,
  targetService?: string,
  endpointId?: string,
): Promise<Response> => {
  const timestamp = Date.now() + msFromNow
  const isodate = new Date(timestamp).toISOString()
  return dispatch({
    type: deleteWithParams ? 'DELETE' : 'GET',
    payload: {
      ...params,
      type,
      timestamp,
      isodate,
      ...(targetService && { targetService }),
      ...(endpointId && { endpoint: endpointId }),
    },
    meta: {
      ident,
      cid,
      ...(gid && { gid }),
      ...(deleteWithParams ? { queue: true } : {}),
    },
  })
}

async function deleteItems(
  dispatch: HandlerDispatch,
  response: Response,
  type: string | string[],
  params: Record<string, unknown>,
  meta: Meta,
  serviceId?: string,
): Promise<Response> {
  if (response.status !== 'ok') {
    return createErrorResponse(
      `Could not get items from service '${serviceId}'. Reason: ${response.status} ${response.error}`,
      'handler:EXPIRE',
    )
  }
  const data = response.data
  if (!isTypedDataArray(data)) {
    return createErrorResponse(
      `No items to expire from service '${serviceId}'`,
      'handler:EXPIRE',
      'noaction',
    )
  }

  const deleteData = data.map((item) => ({ id: item.id, $type: item.$type }))

  return await dispatch(
    createDeleteAction(type, deleteData, params, meta, serviceId),
  )
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
      msFromNow,
      ...params
    },
    meta = {},
  } = action

  if (!type) {
    return createErrorResponse(
      `Can't delete expired from service '${serviceId}' without one or more specified types`,
      'handler:EXPIRE',
      'badrequest',
    )
  }

  const response = await getOrDeleteExpired(
    !!deleteWithParams,
    dispatch,
    type,
    typeof msFromNow === 'number' ? msFromNow : 0,
    params,
    meta,
    serviceId,
    endpointId,
  )

  if (deleteWithParams) {
    // We're deleting directly with params, so we're done
    return response
  } else {
    // We've gotten a response from the `GET` action, so we'll send a `DELETE` if it was successful and returned any data items
    return await deleteItems(dispatch, response, type, params, meta, serviceId)
  }
}
