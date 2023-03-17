import { setErrorOnAction, setResponseOnAction } from '../utils/action.js'
import { isObject, isTypedData } from '../utils/is.js'
import type { Action, Payload, Meta, ActionHandlerResources } from '../types.js'

const extractLastId = (data: unknown, field = 'id') =>
  Array.isArray(data) && isObject(data[data.length - 1])
    ? // eslint-disable-next-line security/detect-object-injection
      data[data.length - 1] && data[data.length - 1][field]
    : undefined

const cleanMeta = ({ id, ...meta }: Meta = {}) => meta

const createAction = (
  page: number,
  { pageAfterField, ...payload }: Payload,
  paging?: Payload,
  data?: unknown,
  meta?: Meta
) =>
  paging
    ? { type: 'GET', payload: paging, meta }
    : {
        type: 'GET',
        payload: {
          ...payload,
          page: Math.floor(page),
          pageOffset: (page - 1) * (payload.pageSize as number),
          pageAfter: extractLastId(
            data,
            typeof pageAfterField === 'string' ? pageAfterField : undefined
          ),
        },
        meta,
      }

function getCurrentPage(payload: Payload) {
  if (typeof payload.page === 'number') {
    return payload.page
  } else if (typeof payload.pageOffset === 'number') {
    return payload.pageOffset / (payload.pageSize as number) + 1
  } else {
    return 1
  }
}

const getFirstId = (data: unknown): string | null | undefined =>
  Array.isArray(data) && isTypedData(data[0]) ? data[0].id : null

function hasProps(obj?: Record<string, unknown>) {
  if (!obj) return false
  const values = Object.values(obj)
  return values.length > 0 && values.some((val) => val !== undefined)
}

const createNextPaging = (payload: Payload, paging?: Payload) =>
  hasProps(paging) ? { ...payload, ...paging } : undefined

/**
 * Get all available pages of data, by calling `GET` with the given payload
 * untill the paging is exhausted.
 */
export default async function getAll(
  action: Action,
  { dispatch }: ActionHandlerResources
): Promise<Action> {
  const { pageSize, noLoopCheck = false } = action.payload

  if (typeof pageSize !== 'number') {
    const { response } = await dispatch({
      type: 'GET',
      payload: action.payload,
      meta: action.meta,
    })
    return setResponseOnAction(action, response)
  }

  const data: unknown[] = []
  let page = getCurrentPage(action.payload)
  let paging: Payload | undefined = undefined
  let lastSize = -1
  let prevFirstId: string | null | undefined = null
  do {
    const { response }: Action = await dispatch(
      createAction(page++, action.payload, paging, data, cleanMeta(action.meta))
    )
    if (response?.status !== 'ok') {
      // Stop and return errors right away
      return setResponseOnAction(action, response)
    }

    // Extract paging for next action
    const prevPaging = paging
    paging = createNextPaging(action.payload, response?.paging?.next)

    // Extract data
    const responseData = response?.data
    if (Array.isArray(responseData)) {
      if (!noLoopCheck) {
        const firstId = getFirstId(responseData)
        if (typeof firstId === 'string' && firstId === prevFirstId) {
          return setErrorOnAction(
            action,
            'GET_ALL detected a possible infinite loop'
          )
        }
        prevFirstId = firstId
      }

      data.push(...responseData)
      lastSize = Array.isArray(responseData) ? responseData.length : 1
    }

    // If no data array or no new page token -- end this
    if (!Array.isArray(responseData) || (prevPaging && !paging)) {
      lastSize = 0
    }
  } while (lastSize === pageSize)

  return setResponseOnAction(action, { status: 'ok', data })
}
