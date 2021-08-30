import pLimit = require('p-limit')
import { Action, Response, InternalDispatch, Meta, TypedData } from '../types'
import { createErrorOnAction } from '../utils/createError'
import { isTypedData, isNotNullOrUndefined } from '../utils/is'
import { ensureArray } from '../utils/array'
import { castDate } from '../transformers/builtIns/date'
import { castNumber } from '../transformers/builtIns/number'

interface ActionParams extends Record<string, unknown> {
  type: string | string[]
  service?: string
  action?: string
  updatedAfter?: Date
  updatedUntil?: Date
  updatedSince?: Date
  updatedBefore?: Date
}

interface SyncParams extends Record<string, unknown> {
  from?: string | Partial<ActionParams> | (string | Partial<ActionParams>)[]
  to?: string | Partial<ActionParams>
  updatedAfter?: Date
  updatedUntil?: Date
  updatedSince?: Date
  updatedBefore?: Date
  retrieve?: 'all' | 'updated'
  doFilterData?: boolean
  doQueueSet?: boolean
  metaKey?: string
  alwaysSet?: boolean
  setLastSyncedAtFromData?: boolean
  maxPerSet?: number
}

interface MetaData {
  meta: {
    lastSyncedAt?: Date
  }
}

const createGetMetaAction = (
  targetService: string,
  type?: string | string[],
  metaKey?: string,
  meta?: Meta
) => ({
  type: 'GET_META',
  payload: { type, params: { keys: 'lastSyncedAt', metaKey }, targetService },
  meta,
})

const createSetMetaAction = (
  lastSyncedAt: Date,
  targetService: string,
  type?: string | string[],
  metaKey?: string,
  meta?: Meta
) => ({
  type: 'SET_META',
  payload: { type, params: { meta: { lastSyncedAt }, metaKey }, targetService },
  meta,
})

const createGetAction = (
  { type, service: targetService, action = 'GET', ...params }: ActionParams,
  meta?: Meta
) => ({
  type: action,
  payload: { type, params, targetService },
  meta,
})

const createSetAction = (
  data: unknown,
  { type, service: targetService, action = 'SET', ...params }: ActionParams,
  doQueueSet: boolean,
  meta?: Meta
): Action => ({
  type: action,
  payload: { type, data, params, targetService },
  meta: { ...meta, queue: doQueueSet },
})

async function setData(
  dispatch: InternalDispatch,
  data: TypedData[],
  { alwaysSet = false, maxPerSet, ...params }: ActionParams,
  doQueueSet: boolean,
  meta?: Meta
): Promise<Response> {
  let index = data.length === 0 && alwaysSet ? -1 : 0 // Trick to always dispatch SET for `alwaysSet`
  const maxCount = castNumber(maxPerSet) || Number.MAX_SAFE_INTEGER

  while (index < data.length) {
    const { response } = await dispatch(
      createSetAction(
        data.slice(index, index + maxCount),
        params,
        doQueueSet,
        meta
      )
    )
    if (!response?.status || !['ok', 'queued'].includes(response.status)) {
      return {
        status: response?.status || 'error',
        error: `SYNC: Could not set data. Set ${index} of ${
          data.length
        } items. ${response?.error || ''}`.trim(),
      }
    }
    index += maxCount
  }

  return data.length > 0 || alwaysSet
    ? { status: 'ok' }
    : { status: 'noaction', error: 'SYNC: No data to set' }
}

const setDatePropIf = (date: string | Date | undefined, prop: string) =>
  date ? { [prop]: castDate(date) || undefined } : {}

const setUpdatedDatesAndType = (
  dispatch: InternalDispatch,
  type: string | string[],
  syncParams: SyncParams,
  meta?: Meta
) =>
  async function setUpdatedDatesAndType(params: Partial<ActionParams>) {
    const {
      retrieve,
      updatedAfter,
      updatedSince,
      updatedUntil,
      updatedBefore,
      metaKey,
    } = syncParams
    const nextParams: ActionParams = {
      ...setDatePropIf(updatedAfter, 'updatedAfter'),
      ...setDatePropIf(updatedSince, 'updatedSince'),
      ...setDatePropIf(updatedUntil, 'updatedUntil'),
      ...setDatePropIf(updatedBefore, 'updatedBefore'),
      type,
      ...params,
    }

    // Fetch lastSyncedAt from meta when needed, and use as updatedAfter
    if (
      retrieve === 'updated' &&
      params.service &&
      !updatedAfter &&
      !updatedSince
    ) {
      const metaResponse = await dispatch(
        createGetMetaAction(params.service, type, metaKey, meta)
      )
      nextParams.updatedAfter =
        castDate(
          (metaResponse.response?.data as MetaData | undefined)?.meta
            .lastSyncedAt
        ) || undefined
    }

    // Make sure the "counterpart" dates are set
    if (nextParams.updatedAfter) {
      nextParams.updatedSince = new Date(nextParams.updatedAfter.getTime() + 1)
    } else if (nextParams.updatedSince) {
      nextParams.updatedAfter = new Date(nextParams.updatedSince.getTime() - 1)
    }
    if (nextParams.updatedUntil) {
      nextParams.updatedBefore = new Date(nextParams.updatedUntil.getTime() + 1)
    } else if (nextParams.updatedBefore) {
      nextParams.updatedUntil = new Date(nextParams.updatedBefore.getTime() - 1)
    }

    // Create from params from dates, type, and params
    return nextParams
  }

const setMetaFromParams = (
  dispatch: InternalDispatch,
  {
    payload: { type, params: { metaKey } = {} },
    meta: { id, ...meta } = {},
  }: Action,
  datesFromData: (Date | undefined)[]
) =>
  async function setMetaFromParams(
    { service, updatedUntil }: ActionParams,
    index: number
  ) {
    if (service) {
      return dispatch(
        createSetMetaAction(
          // eslint-disable-next-line security/detect-object-injection
          datesFromData[index] || updatedUntil || new Date(),
          service,
          type,
          metaKey as string | undefined,
          meta
        )
      )
    }
    return { status: 'noaction' }
  }

const paramsAsObject = (params?: string | Partial<ActionParams>) =>
  typeof params === 'string' ? { service: params } : params

const generateFromParams = async (
  dispatch: InternalDispatch,
  type: string | string[],
  { payload: { params = {} }, meta: { id, ...meta } = {} }: Action
) =>
  Promise.all(
    ensureArray((params as SyncParams).from)
      .map(paramsAsObject)
      .filter(isNotNullOrUndefined)
      .map(setUpdatedDatesAndType(dispatch, type, params, meta))
      .map((p) => pLimit(1)(() => p)) // Run one promise at a time
  )

function generateToParams(
  fromParams: ActionParams[],
  type: string | string[],
  { payload: { params = {} } }: Action
): ActionParams {
  const { to, maxPerSet, alwaysSet }: SyncParams = params
  const updatedUntil = castDate(params.updatedUntil)
  const updatedBefore = castDate(params.updatedBefore)
  const oldestUpdatedAfter = fromParams
    .map((params) => params.updatedAfter)
    .sort()[0]
  return {
    type,
    alwaysSet,
    maxPerSet,
    ...(oldestUpdatedAfter
      ? {
          updatedAfter: oldestUpdatedAfter,
          updatedSince: new Date(oldestUpdatedAfter.getTime() + 1),
        }
      : {}),
    ...(updatedUntil
      ? { updatedUntil, updatedBefore: new Date(updatedUntil.getTime() + 1) }
      : {}),
    ...(updatedBefore
      ? { updatedBefore, updatedUntil: new Date(updatedBefore.getTime() - 1) }
      : {}),
    ...paramsAsObject(to),
  }
}

async function extractActionParams(
  action: Action,
  dispatch: InternalDispatch
): Promise<[ActionParams[], ActionParams | undefined]> {
  const { type } = action.payload
  // Require a type
  if (!type) {
    return [[], undefined]
  }

  // Make from an array of params objects and fetch updatedAfter from meta
  // when needed
  const fromParams = await generateFromParams(dispatch, type, action)

  return [fromParams, generateToParams(fromParams, type, action)]
}

function sortByUpdatedAt(
  { updatedAt: a }: TypedData,
  { updatedAt: b }: TypedData
) {
  const dateA = a ? new Date(a).getTime() : undefined
  const dateB = b ? new Date(b).getTime() : undefined
  return dateA && dateB ? dateA - dateB : dateA ? -1 : 1
}

const withinDateRange =
  (updatedAfter?: Date, updatedUntil?: Date) => (data: TypedData) =>
    (!updatedAfter || (!!data.updatedAt && data.updatedAt > updatedAfter)) &&
    (!updatedUntil || (!!data.updatedAt && data.updatedAt <= updatedUntil))

async function retrieveDataFromOneService(
  dispatch: InternalDispatch,
  params: ActionParams,
  doFilterData: boolean,
  meta?: Meta
) {
  const { updatedAfter, updatedUntil } = params

  // Fetch data from service
  const responseAction = await dispatch(createGetAction(params, meta))

  // Throw is not successfull
  if (responseAction.response?.status !== 'ok') {
    throw new Error(responseAction.response?.error)
  }

  // Return array of data filtered with updatedAt within date range
  const data = ensureArray(responseAction.response.data).filter(isTypedData)
  return doFilterData && (updatedAfter || updatedUntil)
    ? data.filter(withinDateRange(updatedAfter, updatedUntil))
    : data
}

const prepareInputParams = (action: Action) => ({
  ...action,
  payload: {
    ...action.payload,
    params: {
      ...action.payload.params,
      updatedUntil:
        action.payload.params?.updatedUntil === 'now'
          ? new Date()
          : action.payload.params?.updatedUntil,
      retrieve: action.payload.params?.retrieve ?? 'all',
    } as SyncParams,
  },
})

const extractUpdatedAt = (item?: TypedData) =>
  (item?.updatedAt && new Date(item?.updatedAt)) || undefined

const fetchDataFromService = (
  fromParams: ActionParams[],
  doFilterData: boolean,
  dispatch: InternalDispatch,
  { meta: { id, ...meta } = {} }: Action
) =>
  Promise.all(
    fromParams.map((params) =>
      retrieveDataFromOneService(dispatch, params, doFilterData, meta)
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
  inputAction: Action,
  dispatch: InternalDispatch
): Promise<Action> {
  const action = prepareInputParams(inputAction)
  const {
    payload: {
      params: {
        retrieve,
        setLastSyncedAtFromData = false,
        doFilterData = true,
        doQueueSet = true,
      },
    },
    meta: { id, ...meta } = {},
  } = action
  const [fromParams, toParams] = await extractActionParams(action, dispatch)

  if (fromParams.length === 0 || !toParams) {
    return createErrorOnAction(
      action,
      'SYNC: `type`, `to`, and `from` parameters are required',
      'badrequest'
    )
  }

  let data: TypedData[]
  let datesFromData: (Date | undefined)[] = []
  try {
    const dataFromServices = await fetchDataFromService(
      fromParams,
      doFilterData,
      dispatch,
      action
    )
    data = dataFromServices.flat().sort(sortByUpdatedAt)
    if (setLastSyncedAtFromData) {
      datesFromData = extractLastSyncedAtDates(dataFromServices)
    }
  } catch (error) {
    return createErrorOnAction(
      action,
      `SYNC: Could not get data. ${error.message}`
    )
  }

  const response = await setData(dispatch, data, toParams, doQueueSet, meta)
  if (response.status !== 'ok') {
    return createErrorOnAction(
      action,
      response?.error,
      response?.status || 'error'
    )
  }

  if (retrieve === 'updated') {
    await Promise.all(
      fromParams.map(setMetaFromParams(dispatch, action, datesFromData))
    )
  }

  return { ...action, response: { ...action.response, status: 'ok' } }
}
