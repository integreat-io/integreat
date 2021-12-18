import { createErrorOnAction } from '../utils/createError'
import { isTypedData } from '../utils/is'
import {
  Action,
  HandlerDispatch,
  Ident,
  TypedData,
  ActionHandlerResources,
} from '../types'

const isTypedDataArray = (value: unknown): value is TypedData[] =>
  Array.isArray(value) && isTypedData(value[0])

const getExpired = async (
  targetService: string,
  type: string | string[],
  endpointId: string,
  msFromNow: number,
  dispatch: HandlerDispatch,
  ident?: Ident
): Promise<Action> => {
  const timestamp = Date.now() + msFromNow
  const isodate = new Date(timestamp).toISOString()
  return dispatch({
    type: 'GET',
    payload: {
      type,
      params: { timestamp, isodate },
      targetService,
      endpoint: endpointId,
    },
    response: { status: null, returnNoDefaults: true },
    meta: { ident },
  })
}

const deleteExpired = async (
  data: TypedData[],
  targetService: string,
  dispatch: HandlerDispatch,
  ident?: Ident
): Promise<Action> => {
  const deleteData = data.map((item) => ({ id: item.id, $type: item.$type }))

  const deleteAction = {
    type: 'DELETE',
    payload: { data: deleteData, targetService },
    meta: { ident, queue: true },
  }

  return dispatch(deleteAction)
}

/**
 * Action to delete expired items.
 *
 * The given `endpoint` is used to retrieve expired items from the `target`
 * service, and may use the paramters `timestamp` or `isodate`, which represents
 * the current time plus the microseconds in `msFromNow`, the former as
 * microseconds since January 1, 1970, the latter as an ISO formatted date and
 * time string.
 *
 * The items are mapped and typed, so the `type` param should be set to one
 * or more types expected from the `endpoint`, and may be a string or an array
 * of strings.
 */
export default async function expire(
  action: Action,
  { dispatch }: ActionHandlerResources
): Promise<Action> {
  const {
    payload: { type, params, endpoint: endpointId, targetService: serviceId },
    meta: { ident } = {},
  } = action
  const msFromNow = (params?.msFromNow as number) || 0

  if (!serviceId) {
    return createErrorOnAction(
      action,
      `Can't delete expired without a specified service`
    )
  }
  if (!endpointId) {
    return createErrorOnAction(
      action,
      `Can't delete expired from service '${serviceId}' without an endpoint`
    )
  }
  if (!type) {
    return createErrorOnAction(
      action,
      `Can't delete expired from service '${serviceId}' without one or more specified types`
    )
  }

  const expiredAction = await getExpired(
    serviceId,
    type,
    endpointId,
    msFromNow,
    dispatch,
    ident
  )

  if (expiredAction.response?.status !== 'ok') {
    return createErrorOnAction(
      action,
      `Could not get items from service '${serviceId}'. Reason: ${expiredAction.response?.status} ${expiredAction.response?.error}`,
      'noaction'
    )
  }
  const data = expiredAction.response?.data
  if (!isTypedDataArray(data)) {
    return createErrorOnAction(
      action,
      `No items to expire from service '${serviceId}'`,
      'noaction'
    )
  }

  const responseAction = await deleteExpired(data, serviceId, dispatch, ident)

  return {
    ...action,
    response: {
      ...action.response,
      ...responseAction.response,
      status: responseAction.response?.status || null,
    },
  }
}
