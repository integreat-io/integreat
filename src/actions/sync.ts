const debug = require('debug')('great')
import { flatten } from 'ramda'
import action from '../utils/createAction'
import createError from '../utils/createError'

const makeErrorString = results =>
  results
    .map((result, index) =>
      result.status === 'ok' ? null : `[${index}]: ${result.error}`
    )
    .filter(Boolean)
    .join('\n')

const setUpdatedParams = (dispatch, ident) => async params => {
  const { status, data, error } = await dispatch(
    action(
      'GET_META',
      { service: params.service, keys: 'lastSyncedAt' },
      { ident }
    )
  )

  if (status === 'ok' && data && data.meta && data.meta.lastSyncedAt) {
    return {
      ...params,
      updatedAfter: data.meta.lastSyncedAt
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
  updatedUntil
) => {
  if (updatedAfter || updatedUntil) {
    return params.map(params => ({
      ...params,
      updatedAfter: new Date(updatedAfter),
      updatedUntil: new Date(updatedUntil)
    }))
  } else {
    return Promise.all(params.map(setUpdatedParams(dispatch, ident)))
  }
}

const paramsFromStringOrObject = params =>
  typeof params === 'string' ? { service: params } : params

const generateFromParams = async (
  { retrieve, from, updatedAfter, updatedUntil },
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
      updatedUntil
    )
  } else {
    return fromParams
  }
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
    updatedUntil
  }
}

const filterDataOnUpdatedDates = (data, updatedAfter, updatedUntil) =>
  Array.isArray(data) && data.length > 0 && (updatedAfter || updatedUntil)
    ? data.filter(isWithinUpdateWindow(updatedAfter, updatedUntil))
    : data

const isWithinUpdateWindow = (updatedAfter, updatedUntil) => item =>
  item.updatedAt &&
  (!updatedAfter || item.updatedAt > updatedAfter) &&
  (!updatedUntil || item.updatedAt <= updatedUntil)

const getFromService = (
  dispatch,
  type,
  { project, ident }
) => async fromParams => {
  const response = await dispatch(
    action('GET', { type, ...fromParams }, { project, ident })
  )
  if (response.status !== 'ok') {
    return createError(
      `Could not get items from service '${fromParams.service}'. Reason: ${response.status} ${response.error}`
    )
  }

  return {
    status: 'ok',
    data: filterDataOnUpdatedDates(
      response.data,
      fromParams.updatedAfter,
      fromParams.updatedUntil
    )
  }
}

const createSetMetas = (fromParams, lastSyncedAt, ident, dispatch) =>
  fromParams
    .reduce(
      (services, params) =>
        params.service && !services.includes(params.service)
          ? [...services, params.service]
          : services,
      []
    )
    .map(service =>
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
 *
 * @param {Object} payload - Action payload (from, to, type, and retrieve)
 * @param {Object} resources - Dispatch function
 * @returns {Promise} Promise of the action result
 */
async function sync({ payload, meta = {} }, { dispatch }) {
  debug('Action: SYNC')
  const fromParams = await generateFromParams(payload, meta, dispatch)
  const toParams = generateToParams(payload, fromParams)

  const lastSyncedAt = new Date()

  const results = await Promise.all(
    fromParams.map(getFromService(dispatch, payload.type, meta))
  )

  if (results.some(result => result.status !== 'ok')) {
    return results.length === 1
      ? results[0]
      : createError(makeErrorString(results))
  }

  const data = flatten(results.map(result => result.data)).filter(Boolean)

  if (data.length === 0 && payload.syncNoData !== true) {
    return createError(
      `No items to update from service '${fromParams[0].service}'`,
      'noaction'
    )
  }

  return Promise.all([
    ...createSetMetas(fromParams, lastSyncedAt, meta.ident, dispatch),
    dispatch(action('SET', { data, ...toParams }, { ...meta, queue: true }))
  ]).then(responses => {
    return { status: 'ok', data: responses }
  })
}

export default sync
