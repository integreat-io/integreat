import { Exchange, Ident, InternalDispatch, Meta, TypedData } from '../types'
import { completeExchange } from '../utils/exchangeMapping'
import createError from '../utils/createError'
import { isObject, isTypedData, isNotNullOrUndefined } from '../utils/is'
import { ensureArray } from '../utils/array'

interface ExchangeParams extends Record<string, unknown> {
  type: string | string[]
  service?: string
  action?: string
  dontQueueSet?: boolean
}

interface SyncParams extends Record<string, unknown> {
  from?: string | Partial<ExchangeParams> | (string | Partial<ExchangeParams>)[]
  to?: string | Partial<ExchangeParams>
}

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

const exchangeParamsFromParam = (type: string | string[], otherParams = {}) => (
  params?: string | Partial<ExchangeParams>
): ExchangeParams | undefined =>
  typeof params === 'string'
    ? { service: params, ...otherParams, type }
    : isObject(params)
    ? { type, ...otherParams, ...params }
    : undefined

const extractExchangeParams = ({
  type,
  params: { from, to, dontQueueSet } = {},
}: {
  type?: string | string[]
  params?: SyncParams
}) =>
  type
    ? ([
        Array.isArray(from)
          ? from
              .flatMap(exchangeParamsFromParam(type))
              .filter(isNotNullOrUndefined)
          : exchangeParamsFromParam(type)(from),
        exchangeParamsFromParam(type, { dontQueueSet })(to),
      ] as const)
    : [undefined, undefined]

function sortByUpdatedAt(
  { updatedAt: a }: TypedData,
  { updatedAt: b }: TypedData
) {
  const dateA = a ? new Date(a).getTime() : undefined
  const dateB = b ? new Date(b).getTime() : undefined
  return dateA && dateB ? dateA - dateB : dateA ? -1 : 1
}

async function retrieveDataFromOneService(
  dispatch: InternalDispatch,
  params: ExchangeParams,
  ident: Ident | undefined,
  meta: Meta
) {
  const response = await dispatch(createGetExchange(params, ident, meta))
  if (response.status !== 'ok') {
    throw new Error(response.response.error)
  }
  const data = response.response.data
  return ensureArray(data)
}

const retrieveData = async (
  dispatch: InternalDispatch,
  params: ExchangeParams | ExchangeParams[],
  ident: Ident | undefined,
  meta: Meta
) =>
  Array.isArray(params)
    ? (
        await Promise.all(
          params.map((param) =>
            retrieveDataFromOneService(dispatch, param, ident, meta)
          )
        )
      ).flat()
    : retrieveDataFromOneService(dispatch, params, ident, meta)

export default async function syncHandler(
  exchange: Exchange,
  dispatch: InternalDispatch
): Promise<Exchange> {
  const { request, ident, meta } = exchange
  const [fromParams, toParams] = extractExchangeParams(request)
  const { params: { alwaysSet = false } = {} } = request

  if (!fromParams || !toParams) {
    return createError(
      exchange,
      'SYNC: `to` and `from` parameters are required',
      'badrequest'
    )
  }

  let data: TypedData[]
  try {
    data = (await retrieveData(dispatch, fromParams, ident, meta))
      .filter(isTypedData)
      .sort(sortByUpdatedAt)
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

  return { ...exchange, status: 'ok' }
}
