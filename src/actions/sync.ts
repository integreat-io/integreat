import debugLib = require('debug')
import { flatten } from 'ramda'
import action from '../utils/createAction'
import createError from '../utils/createError'
import { isDataObject } from '../utils/is'
import {
  Data,
  DataObject,
  Exchange,
  Ident,
  Meta,
  Dispatch,
  Response,
} from '../types'

const debug = debugLib('great')

export interface Params {
  retrieve?: string
  from?: string | DataObject
  to?: string
  updatedAfter?: Date
  updatedUntil?: Date
  syncNoData?: boolean
}

const makeErrorString = (results: Response[]) =>
  results
    .map((result, index) =>
      result.status === 'ok' ? null : `[${index}]: ${result.error}`
    )
    .filter(Boolean)
    .join('\n')

const setUpdatedParams = (dispatch: Dispatch, ident?: Ident) => async (
  params: DataObject
) => {
  const { status, data, error } = await dispatch(
    action(
      'GET_META',
      {
        service: params.service as string,
        keys: 'lastSyncedAt',
      },
      { ident }
    )
  )

  const updatedAfter =
    isDataObject(data) && isDataObject(data.meta)
      ? (data.meta.lastSyncedAt as string | undefined)
      : undefined

  if (status === 'ok' && updatedAfter) {
    return {
      ...params,
      updatedAfter,
    }
  } else {
    debug(
      'SYNC: Could not get meta for service %s. Error: %s %s',
      params.service,
      status,
      error
    )
  }
  return params
}

const generateParamsWithUpdatedDates = async (
  params: DataObject[],
  dispatch: Dispatch,
  ident?: Ident,
  updatedAfter?: Date,
  updatedUntil?: Date
) => {
  if (updatedAfter || updatedUntil) {
    return params.map((params) => ({
      ...params,
      updatedAfter: updatedAfter ? new Date(updatedAfter) : undefined,
      updatedUntil: updatedUntil ? new Date(updatedUntil) : undefined,
    }))
  } else {
    return Promise.all(params.map(setUpdatedParams(dispatch, ident)))
  }
}

const paramsFromStringOrObject = (params?: string | DataObject) =>
  typeof params === 'string' ? { service: params } : (params as DataObject)

const generateFromParams = async (
  dispatch: Dispatch,
  { retrieve, from, updatedAfter, updatedUntil }: Params,
  ident?: Ident
): Promise<DataObject[]> => {
  const fromParams = ([] as (string | DataObject | undefined)[])
    .concat(from)
    .filter(Boolean)
    .map(paramsFromStringOrObject)
  if (retrieve === 'updated') {
    return generateParamsWithUpdatedDates(
      fromParams,
      dispatch,
      ident,
      updatedAfter,
      updatedUntil
    )
  } else {
    return fromParams as DataObject[]
  }
}

// TODO: Updated dates from the first fromParams are always used on toParams.
// When updatedAfter is fetched from meta on different services, the earliest
// should be used.
const generateToParams = (
  type: string | string[] | undefined,
  { to }: Params,
  fromParams: DataObject[]
) => {
  const { updatedAfter, updatedUntil } = fromParams[0]
  return {
    ...(typeof to === 'string' ? { service: to } : to),
    type,
    updatedAfter,
    updatedUntil,
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
  data: Data,
  updatedAfter: Date,
  updatedUntil: Date
) =>
  isDataArray(data) && (updatedAfter || updatedUntil)
    ? data.filter(isWithinUpdateWindow(updatedAfter, updatedUntil))
    : data

const getFromService = (
  exchange: Exchange,
  dispatch: Dispatch,
  type?: string | string[],
  meta?: Meta,
  ident?: Ident
) => async (fromParams: DataObject): Promise<Exchange> => {
  const response = await dispatch(
    action('GET', { type, ...fromParams }, { project: meta?.project, ident })
  )
  if (response.status !== 'ok') {
    return createError(
      exchange,
      `Could not get items from service '${fromParams.service}'. Reason: ${response.status} ${response.error}`
    )
  }

  return {
    ...exchange,
    status: 'ok',
    response: {
      ...exchange.response,
      data: filterDataOnUpdatedDates(
        response.data,
        fromParams.updatedAfter as Date,
        fromParams.updatedUntil as Date
      ),
    },
  }
}

const createSetMetas = (
  dispatch: Dispatch,
  fromParams: DataObject[],
  lastSyncedAt: Date,
  ident?: Ident
) =>
  fromParams
    .reduce(
      (services, params) =>
        params.service && !services.includes(params.service as string)
          ? [...services, params.service as string]
          : services,
      [] as string[]
    )
    .map((service) =>
      dispatch(
        action('SET_META', { service, meta: { lastSyncedAt } }, { ident })
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
  dispatch: Dispatch
): Promise<Exchange<Data, Response[] | Data>> {
  debug('Action: SYNC')
  const {
    request: { type, params = {} },
    meta,
    ident,
  } = exchange
  const fromParams = await generateFromParams(dispatch, params, ident)
  const toParams = generateToParams(type, params, fromParams)

  const lastSyncedAt = new Date()

  const results = await Promise.all(
    fromParams.map(getFromService(exchange, dispatch, type, meta, ident))
  )

  if (results.some((result) => result.status !== 'ok')) {
    return results.length === 1
      ? results[0]
      : createError(exchange, makeErrorString(results))
  }

  const data = flatten(results.map((result) => result.response.data)).filter(
    Boolean
  )

  if (data.length === 0 && params.syncNoData !== true) {
    return createError(
      exchange,
      `No items to update from service '${fromParams[0].service}'`,
      'noaction'
    )
  }

  return Promise.all([
    ...createSetMetas(dispatch, fromParams, lastSyncedAt, ident),
    dispatch(
      action('SET', { data, ...toParams }, { ...meta, ident, queue: true })
    ),
  ]).then((responses) => {
    return {
      ...exchange,
      status: 'ok',
      response: { ...exchange.response, data: responses },
    }
  })
}
