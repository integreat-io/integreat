import pLimit = require('p-limit')
import { Exchange, Ident, InternalDispatch, Meta, TypedData } from '../types'
import { completeExchange } from '../utils/exchangeMapping'
import createError from '../utils/createError'
import { isTypedData, isNotNullOrUndefined } from '../utils/is'
import { ensureArray } from '../utils/array'

interface ExchangeParams extends Record<string, unknown> {
  type: string | string[]
  service?: string
  action?: string
  updatedAfter?: Date
  updatedUntil?: Date
}

interface SyncParams extends Record<string, unknown> {
  from?: string | Partial<ExchangeParams> | (string | Partial<ExchangeParams>)[]
  to?: string | Partial<ExchangeParams>
  updatedAfter?: Date
  updatedUntil?: Date
  dontQueueSet?: boolean
  retrieve?: 'all' | 'updated'
  setLastSyncedAtFromData?: boolean
}

interface MetaData {
  meta: {
    lastSyncedAt?: Date
  }
}

const createGetMetaExchange = (
  target: string,
  ident: Ident | undefined,
  meta: Meta
) =>
  completeExchange({
    type: 'GET_META',
    request: { params: { keys: 'lastSyncedAt' } },
    target,
    ident,
    meta,
  })

const createSetMetaExchange = (
  lastSyncedAt: Date,
  target: string,
  ident: Ident | undefined,
  meta: Meta
) =>
  completeExchange({
    type: 'SET_META',
    request: { params: { meta: { lastSyncedAt } } },
    target,
    ident,
    meta,
  })

const createGetExchange = (
  { type, service: target, action = 'GET', ...params }: ExchangeParams,
  ident: Ident | undefined,
  meta: Meta
) =>
  completeExchange({
    type: action,
    request: { type, params },
    target,
    ident,
    meta,
  })

const createSetExchange = (
  data: unknown,
  {
    type,
    service: target,
    action = 'SET',
    dontQueueSet = false,
    ...params
  }: ExchangeParams,
  ident: Ident | undefined,
  meta: Meta
) =>
  completeExchange({
    type: action,
    request: { type, data, params },
    target,
    ident,
    meta: { ...meta, queue: !dontQueueSet },
  })

const setUpdatedDatesAndType = (
  dispatch: InternalDispatch,
  ident: Ident | undefined,
  meta: Meta,
  type: string | string[],
  syncParams: SyncParams
) =>
  async function setUpdatedDatesAndType(params: Partial<ExchangeParams>) {
    const { retrieve, updatedAfter, updatedUntil } = syncParams

    // Fetch lastSyncedAt from meta when needed, and use as updatedAfter
    if (retrieve === 'updated' && params.service && !updatedAfter) {
      const metaResponse = await dispatch(
        createGetMetaExchange(params.service, ident, meta)
      )
      params.updatedAfter = (metaResponse.response.data as
        | MetaData
        | undefined)?.meta.lastSyncedAt
    }

    // Create from params from dates, type, and params
    return {
      ...(updatedAfter && { updatedAfter }),
      ...(updatedUntil && { updatedUntil }),
      type,
      ...params,
    }
  }

const setMetaFromParams = (
  dispatch: InternalDispatch,
  { ident, meta }: Exchange,
  datesFromData: (Date | undefined)[]
) =>
  async function setMetaFromParams(
    { service, updatedUntil }: ExchangeParams,
    index: number
  ) {
    if (service) {
      return dispatch(
        createSetMetaExchange(
          // eslint-disable-next-line security/detect-object-injection
          datesFromData[index] || updatedUntil || new Date(),
          service,
          ident,
          meta
        )
      )
    }
    return { status: 'noaction' }
  }

const paramsAsObject = (params?: string | Partial<ExchangeParams>) =>
  typeof params === 'string' ? { service: params } : params

const generateFromParams = async (
  dispatch: InternalDispatch,
  type: string | string[],
  { request: { params = {} }, ident, meta }: Exchange
) =>
  Promise.all(
    ensureArray((params as SyncParams).from)
      .map(paramsAsObject)
      .filter(isNotNullOrUndefined)
      .map(setUpdatedDatesAndType(dispatch, ident, meta, type, params))
      .map((p) => pLimit(1)(() => p)) // Run one promise at a time
  )

function generateToParams(
  fromParams: ExchangeParams[],
  type: string | string[],
  { request: { params = {} } }: Exchange
): ExchangeParams {
  const { to, updatedUntil, dontQueueSet }: SyncParams = params
  const oldestUpdatedAfter = fromParams
    .map((params) => params.updatedAfter)
    .sort()[0]
  return {
    type,
    dontQueueSet,
    ...(oldestUpdatedAfter ? { updatedAfter: oldestUpdatedAfter } : {}),
    ...(updatedUntil ? { updatedUntil } : {}),
    ...paramsAsObject(to),
  }
}

async function extractExchangeParams(
  exchange: Exchange,
  dispatch: InternalDispatch
): Promise<[ExchangeParams[], ExchangeParams | undefined]> {
  const {
    request: { type },
  } = exchange
  // Require a type
  if (!type) {
    return [[], undefined]
  }

  // Make from an array of params objects and fetch updatedAfter from meta
  // when needed
  const fromParams = await generateFromParams(dispatch, type, exchange)

  return [fromParams, generateToParams(fromParams, type, exchange)]
}

function sortByUpdatedAt(
  { updatedAt: a }: TypedData,
  { updatedAt: b }: TypedData
) {
  const dateA = a ? new Date(a).getTime() : undefined
  const dateB = b ? new Date(b).getTime() : undefined
  return dateA && dateB ? dateA - dateB : dateA ? -1 : 1
}

const withinDateRange = (updatedAfter?: Date, updatedUntil?: Date) => (
  data: TypedData
) =>
  (!updatedAfter || (!!data.updatedAt && data.updatedAt > updatedAfter)) &&
  (!updatedUntil || (!!data.updatedAt && data.updatedAt <= updatedUntil))

async function retrieveDataFromOneService(
  dispatch: InternalDispatch,
  params: ExchangeParams,
  ident: Ident | undefined,
  meta: Meta
) {
  const { updatedAfter, updatedUntil } = params

  // Fetch data from service
  const response = await dispatch(createGetExchange(params, ident, meta))

  // Throw is not successfull
  if (response.status !== 'ok') {
    throw new Error(response.response.error)
  }

  // Return array of data filtered with updatedAt within date range
  const data = ensureArray(response.response.data).filter(isTypedData)

  return updatedAfter || updatedUntil
    ? data.filter(withinDateRange(updatedAfter, updatedUntil))
    : data
}

const prepareInputParams = (exchange: Exchange) => ({
  ...exchange,
  request: {
    ...exchange.request,
    params: {
      ...exchange.request.params,
      updatedUntil:
        exchange.request.params?.updatedUntil === 'now'
          ? new Date()
          : exchange.request.params?.updatedUntil,
      retrieve: exchange.request.params?.retrieve ?? 'all',
    } as SyncParams,
  },
})

const extractUpdatedAt = (item?: TypedData) =>
  (item?.updatedAt && new Date(item?.updatedAt)) || undefined

const fetchDataFromService = (
  fromParams: ExchangeParams[],
  dispatch: InternalDispatch,
  { ident, meta }: Exchange
) =>
  Promise.all(
    fromParams.map((params) =>
      retrieveDataFromOneService(dispatch, params, ident, meta)
    )
  )

const extractLastSyncedAtDates = (dataFromServices: TypedData[][]) =>
  dataFromServices.map((data) =>
    data
      .map(extractUpdatedAt)
      .reduce(
        (lastDate, date) =>
          !lastDate || (date && date > lastDate) ? date : lastDate,
        undefined
      )
  )

/**
 * Handler for SYNC action, to sync data from one service to another.
 *
 * `retrieve` indicates which items to retrieve. The default is `all`, which
 * will retrieve all items from the `get` endpoint(s). Set `retrieve` to
 * `updated` to retrieve only items that are updated after the  `lastSyncedAt`
 * date for the `from` service(s). This is done by passing the `lastSyncedAt`
 * date as a parameter named `updatedAfter` to the `get` endpoint(s), and by
 * filtering away any items received with `updatedAt` earlier than
 * `lastSyncedAt`.
 *
 * The `lastSyncedAt` metadata will be set on the `from` service when items
 * are retrieved and updated. By default it will be set to the updatedUntil date
 * or now if no updatedUntil is given. When `setLastSyncedAtFromData` is true,
 * the latest updatedAt from the data will be used for each service.
 */
export default async function syncHandler(
  exchangeInput: Exchange,
  dispatch: InternalDispatch
): Promise<Exchange> {
  const exchange = prepareInputParams(exchangeInput)
  const {
    ident,
    meta,
    request: {
      params: { retrieve, setLastSyncedAtFromData = false },
    },
  } = exchange
  const [fromParams, toParams] = await extractExchangeParams(
    prepareInputParams(exchange),
    dispatch
  )
  const { alwaysSet = false } = exchange.request.params ?? {}

  if (fromParams.length === 0 || !toParams) {
    return createError(
      exchange,
      'SYNC: `type`, `to`, and `from` parameters are required',
      'badrequest'
    )
  }

  let data: TypedData[]
  let datesFromData: (Date | undefined)[] = []
  try {
    const dataFromServices = await fetchDataFromService(
      fromParams,
      dispatch,
      exchange
    )
    data = dataFromServices.flat().sort(sortByUpdatedAt)
    if (setLastSyncedAtFromData) {
      datesFromData = extractLastSyncedAtDates(dataFromServices)
    }
  } catch (error) {
    return createError(exchange, `SYNC: Could not get data. ${error.message}`)
  }

  if (!alwaysSet && data.length === 0) {
    return createError(exchange, 'SYNC: No data to set', 'noaction')
  }

  const response = await dispatch(
    createSetExchange(data, toParams, ident, meta)
  )
  if (response.status !== 'ok' && response.status !== 'queued') {
    return createError(
      exchange,
      `SYNC: Could not set data. ${response.response.error}`
    )
  }

  if (retrieve === 'updated') {
    await Promise.all(
      fromParams.map(setMetaFromParams(dispatch, exchange, datesFromData))
    )
  }

  return { ...exchange, status: 'ok' }
}
