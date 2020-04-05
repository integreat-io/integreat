import action from '../utils/createAction'
import createError from '../utils/createError'
import { responseToExchange } from '../utils/exchangeMapping'
import { Exchange, Dispatch, Ident, Response, TypedData } from '../types'

const getExpired = async (
  service: string,
  type: string | string[],
  endpointId: string,
  msFromNow: number,
  dispatch: Dispatch<TypedData[]>,
  ident?: Ident
): Promise<Response<TypedData[]>> => {
  const timestamp = Date.now() + msFromNow
  const isodate = new Date(timestamp).toISOString()
  const payloadGet = {
    service,
    type,
    endpoint: endpointId,
    onlyMappedValues: true,
    timestamp,
    isodate,
  }

  return dispatch(action('GET', payloadGet, { ident }))
}

const deleteExpired = async (
  exchange: Exchange,
  response: Response<TypedData[]>,
  service: string,
  dispatch: Dispatch,
  ident?: Ident
) => {
  if (response.status !== 'ok' || !Array.isArray(response.data)) {
    return createError(
      exchange,
      `Could not get items from service '${service}'. Reason: ${response.status} ${response.error}`,
      'noaction'
    )
  }
  if (response.data.length === 0) {
    return createError(
      exchange,
      `No items to expire from service '${service}'`,
      'noaction'
    )
  }

  const data = response.data.map((item) => ({ id: item.id, type: item.type }))

  return dispatch(action('DELETE', { service, data }, { queue: true, ident }))
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
  dispatch: Dispatch<TypedData[]>
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

  const expiredResponse = await getExpired(
    service,
    type,
    endpointId,
    msFromNow,
    dispatch,
    ident
  )

  const response = await deleteExpired(
    exchange,
    expiredResponse,
    service,
    dispatch,
    ident
  )

  return responseToExchange(exchange, response)
}
