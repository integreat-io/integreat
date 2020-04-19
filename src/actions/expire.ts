import createError from '../utils/createError'
import { completeExchange } from '../utils/exchangeMapping'
import { isTypedData } from '../utils/is'
import { Exchange, InternalDispatch, Ident, TypedData } from '../types'

const isTypedDataArray = (value: unknown): value is TypedData[] =>
  Array.isArray(value) && isTypedData(value[0])

const getExpired = async (
  service: string,
  type: string | string[],
  endpointId: string,
  msFromNow: number,
  dispatch: InternalDispatch,
  ident?: Ident
): Promise<Exchange> => {
  const timestamp = Date.now() + msFromNow
  const isodate = new Date(timestamp).toISOString()
  return dispatch(
    completeExchange({
      type: 'GET',
      request: {
        type,
        service,
        params: { timestamp, isodate },
      },
      response: { returnNoDefaults: true },
      endpointId,
      ident,
    })
  )
}

const deleteExpired = async (
  data: TypedData[],
  service: string,
  dispatch: InternalDispatch,
  ident?: Ident
): Promise<Exchange> => {
  const deleteData = data.map((item) => ({ id: item.id, $type: item.$type }))

  const deleteExchange = completeExchange({
    type: 'DELETE',
    request: { service, data: deleteData },
    ident,
    meta: { queue: true },
  })

  return dispatch(deleteExchange)
}

/**
 * Action to delete expired items.
 *
 * The given `endpoint` is used to retrieve expired items from the `service`, and
 * may use the paramters `timestamp` or `isodate`, which represents the current
 * time plus the microseconds in `msFromNow`, the former as microseconds since
 * January 1, 1970, the latter as an ISO formatted date and time string.
 *
 * The items are mapped and typed, so the `type` param should be set to one
 * or more types expected from the `endpoint`, and may be a string or an array
 * of strings.
 */
export default async function expire(
  exchange: Exchange,
  dispatch: InternalDispatch
): Promise<Exchange> {
  const {
    ident,
    endpointId,
    request: { service, type, params },
  } = exchange
  const msFromNow = (params?.msFromNow as number) || 0

  if (!service) {
    return createError(
      exchange,
      `Can't delete expired without a specified service`
    )
  }
  if (!endpointId) {
    return createError(
      exchange,
      `Can't delete expired from service '${service}' without an endpoint`
    )
  }
  if (!type) {
    return createError(
      exchange,
      `Can't delete expired from service '${service}' without one or more specified types`
    )
  }

  const expiredExchange = await getExpired(
    service,
    type,
    endpointId,
    msFromNow,
    dispatch,
    ident
  )

  if (expiredExchange.status !== 'ok') {
    return createError(
      exchange,
      `Could not get items from service '${service}'. Reason: ${expiredExchange.status} ${expiredExchange.response.error}`,
      'noaction'
    )
  }
  const data = expiredExchange.response.data
  if (!isTypedDataArray(data)) {
    return createError(
      exchange,
      `No items to expire from service '${service}'`,
      'noaction'
    )
  }

  const responseExchange = await deleteExpired(data, service, dispatch, ident)

  return {
    ...exchange,
    status: responseExchange.status,
    response: {
      ...exchange.response,
      ...responseExchange.response,
    },
  }
}
