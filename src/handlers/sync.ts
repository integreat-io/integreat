import debugLib = require('debug')
import { flatten } from 'ramda'
import { completeExchange } from '../utils/exchangeMapping'
import createError from '../utils/createError'
import { isDataObject } from '../utils/is'
import {
  DataObject,
  Exchange,
  ExchangeRequest,
  Ident,
  Meta,
  InternalDispatch,
} from '../types'

const debug = debugLib('great')

export interface FromParams extends DataObject {
  id?: string | string[]
  type?: string | string[]
  target?: string
}

export interface Params {
  retrieve?: string
  from?: string | FromParams
  to?: string
  updatedAfter?: Date
  updatedUntil?: Date
  syncNoData?: boolean
}

interface Request extends ExchangeRequest {
  target?: string
}

const makeErrorString = (results: Exchange[]) =>
  results
    .map((result, index) =>
      result.status === 'ok' ? null : `[${index}]: ${result.response.error}`
    )
    .filter(Boolean)
    .join('\n')

const setUpdatedParams = (dispatch: InternalDispatch, ident?: Ident) => async (
  request: Request
) => {
  const { status, response: { data, error } = {} } = await dispatch(
    completeExchange({
      type: 'GET_META',
      request: {
        params: { keys: 'lastSyncedAt' },
      },
      target: request.target,
      ident,
    })
  )

  const updatedAfter =
    isDataObject(data) && isDataObject(data.meta)
      ? (data.meta.lastSyncedAt as string | undefined)
      : undefined

  if (status === 'ok' && updatedAfter) {
    return {
      ...request,
      params: {
        ...request.params,
        updatedAfter,
      },
    }
  } else {
    debug(
      'SYNC: Could not get meta for service %s. Error: %s %s',
      request.target,
      status,
      error
    )
  }
  return request
}

const generateRequestWithUpdatedDates = async (
  requests: Request[],
  dispatch: InternalDispatch,
  ident?: Ident,
  updatedAfter?: Date,
  updatedUntil?: Date
): Promise<Request[]> => {
  if (updatedAfter || updatedUntil) {
    return requests.map((request) => ({
      ...request,
      params: {
        ...request.params,
        updatedAfter: updatedAfter ? new Date(updatedAfter) : undefined,
        updatedUntil: updatedUntil ? new Date(updatedUntil) : undefined,
      },
    }))
  } else {
    return Promise.all(requests.map(setUpdatedParams(dispatch, ident)))
  }
}

const generateRequestFromParams = ({
  id,
  type,
  target,
  ...params
}: FromParams = {}): Request => ({
  ...(id && { id }),
  ...(type && { type }),
  ...(target && { target }),
  params,
})

const requestFromStringOrObject = (params?: string | FromParams): Request =>
  typeof params === 'string'
    ? { target: params }
    : generateRequestFromParams(params)

const generateFromRequest = async (
  dispatch: InternalDispatch,
  { retrieve, from, updatedAfter, updatedUntil }: Params,
  ident?: Ident
): Promise<Request[]> => {
  const requests = ([] as (string | FromParams | undefined)[])
    .concat(from)
    .filter(Boolean)
    .map(requestFromStringOrObject)
  if (retrieve === 'updated') {
    return generateRequestWithUpdatedDates(
      requests,
      dispatch,
      ident,
      updatedAfter,
      updatedUntil
    )
  } else {
    return requests as DataObject[]
  }
}

// TODO: Updated dates from the first fromParams are always used on toParams.
// When updatedAfter is fetched from meta on different services, the earliest
// should be used.
const generateToRequest = (
  type: string | string[] | undefined,
  { to }: Params,
  fromRequest: Request[]
): Request => {
  const requestFromParams =
    typeof to === 'string' ? { target: to } : generateRequestFromParams(to)
  const { params: { updatedAfter, updatedUntil } = {} } = fromRequest[0]
  return {
    ...requestFromParams,
    type,
    params: {
      ...requestFromParams.params,
      updatedAfter,
      updatedUntil,
    },
  }
}

const isWithinUpdateWindow = (updatedAfter: Date, updatedUntil: Date) => (
  item: DataObject
) =>
  item.updatedAt &&
  (!updatedAfter || item.updatedAt > updatedAfter) &&
  (!updatedUntil || item.updatedAt <= updatedUntil)

const isDataArray = (data: unknown): data is DataObject[] =>
  Array.isArray(data) && data.length > 0

const filterDataOnUpdatedDates = (
  data: unknown,
  updatedAfter: Date,
  updatedUntil: Date
) =>
  isDataArray(data) && (updatedAfter || updatedUntil)
    ? data.filter(isWithinUpdateWindow(updatedAfter, updatedUntil))
    : data

const getFromService = (
  exchange: Exchange,
  dispatch: InternalDispatch,
  type?: string | string[],
  meta?: Meta,
  ident?: Ident
) => async ({ target, ...request }: Request): Promise<Exchange> => {
  const response = await dispatch(
    completeExchange({
      type: 'GET',
      request: { type, ...request },
      target,
      ident,
      meta: { project: meta?.project },
    })
  )
  if (response.status !== 'ok') {
    return createError(
      exchange,
      `Could not get items from service '${target}'. Reason: ${response.status} ${response.response.error}`
    )
  }

  return {
    ...exchange,
    status: 'ok',
    response: {
      ...exchange.response,
      data: filterDataOnUpdatedDates(
        response.response?.data,
        request.params?.updatedAfter as Date,
        request.params?.updatedUntil as Date
      ),
    },
  }
}

const createSetMetas = (
  dispatch: InternalDispatch,
  fromRequests: Request[],
  lastSyncedAt: Date,
  ident?: Ident
) =>
  fromRequests
    .reduce(
      (services, { target }) =>
        target && !services.includes(target as string)
          ? [...services, target as string]
          : services,
      [] as string[]
    )
    .map((target) =>
      dispatch(
        completeExchange({
          type: 'SET_META',
          request: { params: { meta: { lastSyncedAt } } },
          target,
          ident,
        })
      )
    )

/**
 * Action to sync from one service to another.
 *
 * `retrieve` indicates which items to retrieve. The default is `all`, which
 * will retrieve all items from the `get` endpoint. Set `retrieve` to `updated`
 * to retrieve only items that are updated after the  `lastSyncedAt` date for
 * the `from` service. This is done by passing the `lastSyncedAt` date as a
 * parameter named `updatedAfter` to the `get` endpoint, and by actively
 * filter away any items received with `updatedAt` earlier than `lastSyncedAt`.
 *
 * The `lastSyncedAt` metadata will be set on the `from` service when items
 * are retrieved and updated.
 */
export default async function sync(
  exchange: Exchange,
  dispatch: InternalDispatch
): Promise<Exchange> {
  debug('Action: SYNC')
  const {
    request: { type, params = {} },
    meta,
    ident,
  } = exchange
  const fromRequests = await generateFromRequest(dispatch, params, ident)
  const { target: toTarget, ...toRequest } = generateToRequest(
    type,
    params,
    fromRequests
  )

  const lastSyncedAt = new Date()

  const results = await Promise.all(
    fromRequests.map(getFromService(exchange, dispatch, type, meta, ident))
  )

  if (results.some((result) => result.status !== 'ok')) {
    return results.length === 1
      ? results[0]
      : createError(exchange, makeErrorString(results))
  }

  const data = flatten(results.map((result) => result.response.data)).filter(
    Boolean
  )

  // Treat truthy values on syncNoData as false
  if (data.length === 0 && params.syncNoData !== true) {
    return createError(
      exchange,
      `No items to update from service '${fromRequests[0].target}'`,
      'noaction'
    )
  }

  return Promise.all([
    ...createSetMetas(dispatch, fromRequests, lastSyncedAt, ident),
    dispatch(
      completeExchange({
        type: 'SET',
        request: { data, ...toRequest },
        target: toTarget,
        ident,
        meta: { ...meta, queue: true },
      })
    ),
  ]).then((responses) => {
    return {
      ...exchange,
      status: 'ok',
      response: {
        ...exchange.response,
        data: responses.map((response) => ({
          data: response.response.data,
          status: response.status,
        })),
      },
    }
  })
}
