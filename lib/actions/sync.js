const debug = require('debug')('great')
const { flatten } = require('ramda')
const pLimit = require('p-limit')
const action = require('../utils/createAction')
const createError = require('../utils/createError')

const createTransformAction = (
  { action: type, ...payload },
  data,
  { ident, project }
) => action(type, { ...payload, data }, { ident, project })

const makeErrorString = (results) =>
  results
    .map((result, index) =>
      result.status === 'ok' ? null : `[${index}]: ${result.error}`
    )
    .filter(Boolean)
    .join('\n')

const addDeltaToDate = (date, delta) =>
  delta ? new Date(date.getTime() + delta) : date

const generateUpdatedAfter = (updatedAfter, afterDelta) => ({
  updatedAfter: addDeltaToDate(updatedAfter, afterDelta),
  updatedSince: addDeltaToDate(updatedAfter, 1),
})

const setUpdatedParams =
  (dispatch, dontSetUntil, afterDelta, untilDelta, metaKey, ident) =>
  async (params) => {
    const { status, data, error } = await dispatch(
      action(
        'GET_META',
        { service: params.service, metaKey, keys: 'lastSyncedAt' },
        { ident }
      )
    )

    if (status === 'ok' && data && data.meta && data.meta.lastSyncedAt) {
      return {
        ...params,
        ...generateUpdatedAfter(data.meta.lastSyncedAt, afterDelta),
        updatedUntil: dontSetUntil
          ? undefined
          : addDeltaToDate(new Date(), untilDelta),
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
  params,
  dispatch,
  ident,
  updatedAfter,
  updatedUntil,
  afterDelta,
  untilDelta,
  metaKey
) => {
  if (updatedAfter) {
    return params.map((params) => ({
      ...params,
      ...generateUpdatedAfter(new Date(updatedAfter), afterDelta),
      updatedUntil:
        updatedUntil === 'open'
          ? undefined
          : addDeltaToDate(
              updatedUntil ? new Date(updatedUntil) : new Date(),
              untilDelta
            ),
    }))
  } else {
    return Promise.all(
      params.map(
        setUpdatedParams(
          dispatch,
          updatedUntil === 'open',
          afterDelta,
          untilDelta,
          metaKey,
          ident
        )
      )
    )
  }
}

const paramsFromStringOrObject = (params) =>
  typeof params === 'string' ? { service: params } : params

const generateFromParams = async (
  {
    retrieve,
    from,
    updatedAfter,
    updatedUntil,
    afterDelta,
    untilDelta,
    metaKey,
  },
  { ident },
  dispatch
) => {
  const fromParams = [].concat(from).map(paramsFromStringOrObject)
  if (retrieve === 'updated') {
    return generateParamsWithUpdatedDates(
      fromParams,
      dispatch,
      ident,
      updatedAfter,
      updatedUntil,
      afterDelta,
      untilDelta,
      metaKey
    )
  } else {
    return fromParams
  }
}

const generateDoneParams = ({ from, type, done }) => {
  if (done) {
    return { service: from, type, ...done }
  }
  return null
}

const generateTransformParams = ({ transform }, { service, type }) => {
  if (Array.isArray(transform)) {
    return transform.map((trans) => ({ service, type, ...trans }))
  } else if (transform) {
    return [{ service, type, ...transform }]
  }
  return []
}

// TODO: Updated dates from the first fromParams are always used on toParams.
// When updatedAfter is fetched from meta on different services, the earliest
// should be used.
const generateToParams = ({ to, type }, fromParams) => {
  const { updatedAfter, updatedUntil } = fromParams[0]
  return {
    ...(typeof to === 'string' ? { service: to } : to),
    type,
    updatedAfter,
    updatedUntil,
  }
}

const filterDataOnUpdatedDates = (data, updatedAfter, updatedUntil) =>
  Array.isArray(data) && data.length > 0 && (updatedAfter || updatedUntil)
    ? data.filter(isWithinUpdateWindow(updatedAfter, updatedUntil))
    : data

const isWithinUpdateWindow = (updatedAfter, updatedUntil) => (item) =>
  item.attributes.updatedAt &&
  (!updatedAfter || item.attributes.updatedAt > updatedAfter) &&
  (!updatedUntil || item.attributes.updatedAt <= updatedUntil)

const getFromService =
  (dispatch, type, noFilter = false, { project, ident }) =>
  async ({ action: fromAction = 'GET', ...fromParams }) => {
    const response = await dispatch(
      action(fromAction, { type, ...fromParams }, { project, ident })
    )
    if (response.status !== 'ok') {
      return createError(
        `Could not get items from service '${fromParams.service}'. Reason: ${response.status} ${response.error}`
      )
    }

    return {
      status: 'ok',
      data: noFilter
        ? response.data
        : filterDataOnUpdatedDates(
            response.data,
            fromParams.updatedAfter,
            fromParams.updatedUntil
          ),
    }
  }

function isConfiguredWithMeta(serviceId, getService) {
  const service = getService(null, serviceId)
  return !!(service && service.meta)
}

const createSetMetas = (
  fromParams,
  lastSyncedAt,
  metaKey,
  ident,
  dispatch,
  getService
) =>
  fromParams
    .reduce(
      (services, params) =>
        params.service &&
        !services.includes(params.service) &&
        isConfiguredWithMeta(params.service, getService)
          ? [...services, params.service]
          : services,
      []
    )
    .map((service) =>
      dispatch(
        action(
          'SET_META',
          { service, metaKey, meta: { lastSyncedAt } },
          { ident }
        )
      )
    )

const createSetActions = (toAction, data, toParams, meta, useIndividualSet) =>
  useIndividualSet
    ? data.map((item) => action(toAction, { data: item, ...toParams }, meta))
    : [action(toAction, { data, ...toParams }, meta)]

const createDoneAction = (
  data,
  { action: type = 'SET', ...params },
  { ident, project }
) => ({
  type,
  payload: { ...params, data },
  meta: { ident, project },
})

const isError = (response) =>
  !['ok', 'queued', 'noaction'].includes(response.status)

function getLastSyncedAt(
  fromParams,
  data,
  setLastSyncedAtFromData = false,
  untilDelta = 0
) {
  if (setLastSyncedAtFromData) {
    return data
      .map((item) => item.attributes.updatedAt)
      .reduce((latest, date) => (latest > date ? latest : date))
  } else if (fromParams[0]) {
    const lastSyncedAt = fromParams
      .map((param) => param.updatedUntil)
      .sort((a, b) =>
        a instanceof Date && b instanceof Date ? a.getTime() - b.getTime() : 0
      )[0]
    return addDeltaToDate(lastSyncedAt, untilDelta * -1) // Subtract delta to get the actual updatedUntil date
  }
  return undefined
}

async function transformPipeline(data, dispatch, transformParams, meta) {
  let response
  for (const params of transformParams) {
    const nextData = response ? response.data : data
    response = await dispatch(createTransformAction(params, nextData, meta))
    if (response.status !== 'ok') {
      return response
    }
  }
  return response
}

async function transformData(
  data,
  dispatch,
  transformParams,
  meta,
  useIndividualTransform
) {
  if (useIndividualTransform) {
    return await Promise.all(
      data
        .map((item) => transformPipeline(item, dispatch, transformParams, meta))
        .map((p) => pLimit(1)(() => p))
    )
  } else {
    return [await transformPipeline(data, dispatch, transformParams, meta)]
  }
}

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
 *
 * @param {Object} payload - Action payload (from, to, type, and retrieve)
 * @param {Object} resources - Dispatch function
 * @returns {Promise} Promise of the action result
 */
async function sync({ payload, meta = {} }, { dispatch, getService }) {
  debug('Action: SYNC')
  const fromParams = await generateFromParams(payload, meta, dispatch)
  const { action: toAction = 'SET', ...toParams } = generateToParams(
    payload,
    fromParams
  )
  const transformParams = generateTransformParams(payload, toParams)
  const { queueSet = true, metaKey, useIndividualSet = false } = payload
  const doneParams = generateDoneParams(payload)

  const results = await Promise.all(
    fromParams.map(
      getFromService(dispatch, payload.type, payload.noFilter, meta)
    )
  )

  if (results.some((result) => result.status !== 'ok')) {
    return results.length === 1
      ? results[0]
      : createError(makeErrorString(results))
  }

  let data = flatten(results.map((result) => result.data)).filter(Boolean)

  if (data.length === 0 && payload.syncNoData !== true) {
    return createError(
      `No items to update from service '${fromParams[0].service}'`,
      'noaction'
    )
  }

  const lastSyncedAt =
    getLastSyncedAt(
      fromParams,
      data,
      payload.setLastSyncedAtFromData,
      payload.untilDelta
    ) || new Date()

  // Dispatch transform action
  if (transformParams.length > 0) {
    const transformResults = await transformData(
      data,
      dispatch,
      transformParams,
      meta,
      payload.useIndividualTransform
    )

    if (transformResults.some((result) => result.status !== 'ok')) {
      return transformResults.length === 1
        ? transformResults[0]
        : createError(makeErrorString(transformResults))
    }

    data = flatten(transformResults.map((result) => result.data)).filter(
      Boolean
    )

    if (data.length === 0 && payload.syncNoData !== true) {
      return createError(
        `No items to update from service '${fromParams[0].service}' after transform action`,
        'noaction'
      )
    }
  }

  const setMetaActions = createSetMetas(
    fromParams,
    lastSyncedAt,
    metaKey,
    meta.ident,
    dispatch,
    getService
  )
  const setActions = createSetActions(
    toAction,
    data,
    toParams,
    { ...meta, queue: queueSet },
    useIndividualSet
  )

  // Dispatch set actions
  const responses = await Promise.all(
    [...setMetaActions, ...setActions.map(dispatch)].map((p) =>
      pLimit(1)(() => p)
    )
  )

  // Get responses, excluding set meta actions
  const setResponses = responses.slice(setMetaActions.length)
  // Get error responses
  const errors = setResponses.filter(isError)

  // Dispatch done action
  if (doneParams && errors.length < setResponses.length) {
    const doneData = useIndividualSet
      ? data.filter((_item, index) => !isError(setResponses[index]))
      : data
    await dispatch(createDoneAction(doneData, doneParams, meta))
  }

  // Return SYNC response
  return {
    status: errors.length ? 'error' : 'ok',
    data: setResponses,
    ...(errors.length
      ? { error: `${errors.length} of ${setResponses.length} actions failed` }
      : {}),
  }
}

module.exports = sync
