import { setResponseOnAction, setErrorOnAction } from '../utils/action.js'
import { isTypedData } from '../utils/is.js'
import type {
  Action,
  HandlerDispatch,
  Ident,
  TypedData,
  ActionHandlerResources,
} from '../types.js'

const isTypedDataArray = (value: unknown): value is TypedData[] =>
  Array.isArray(value) && isTypedData(value[0])

const getExpired = async (
  targetService: string,
  type: string | string[],
  endpointId: string,
  msFromNow: number,
  dispatch: HandlerDispatch,
  cid?: string,
  ident?: Ident
): Promise<Action> => {
  const timestamp = Date.now() + msFromNow
  const isodate = new Date(timestamp).toISOString()
  return dispatch({
    type: 'GET',
    payload: {
      type,
      timestamp,
      isodate,
      targetService,
      endpoint: endpointId,
    },
    meta: { ident, cid },
  })
}

const deleteExpired = async (
  data: TypedData[],
  targetService: string,
  dispatch: HandlerDispatch,
  cid?: string,
  ident?: Ident
): Promise<Action> => {
  const deleteData = data.map((item) => ({ id: item.id, $type: item.$type }))

  const deleteAction = {
    type: 'DELETE',
    payload: { data: deleteData, targetService },
    meta: { ident, queue: true, cid },
  }

  return await dispatch(deleteAction)
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
    payload: { type, endpoint: endpointId, targetService: serviceId },
    meta: { ident, cid } = {},
  } = action
  const msFromNow = (action.payload.msFromNow as number) || 0

  if (!serviceId) {
    return setErrorOnAction(
      action,
      `Can't delete expired without a specified service`
    )
  }
  if (!endpointId) {
    return setErrorOnAction(
      action,
      `Can't delete expired from service '${serviceId}' without an endpoint`
    )
  }
  if (!type) {
    return setErrorOnAction(
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
    cid,
    ident
  )

  if (expiredAction.response?.status !== 'ok') {
    return setErrorOnAction(
      action,
      `Could not get items from service '${serviceId}'. Reason: ${expiredAction.response?.status} ${expiredAction.response?.error}`,
      'error'
    )
  }
  const data = expiredAction.response?.data
  if (!isTypedDataArray(data)) {
    return setErrorOnAction(
      action,
      `No items to expire from service '${serviceId}'`,
      'noaction'
    )
  }

  const { response } = await deleteExpired(
    data,
    serviceId,
    dispatch,
    cid,
    ident
  )

  return setResponseOnAction(action, response)
}
