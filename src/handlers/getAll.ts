import { Action, Payload, Meta, ActionHandlerResources } from '../types'
import { isObject, isTypedData } from '../utils/is'

const extractLastId = (data: unknown) =>
  Array.isArray(data) && isObject(data[data.length - 1])
    ? data[data.length - 1]?.id
    : undefined

const createAction = (
  page: number,
  payload: Payload,
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
          pageAfter: extractLastId(data),
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
export default async function get(
  action: Action,
  { dispatch }: ActionHandlerResources
): Promise<Action> {
  const { pageSize, params: { noLoopCheck = false } = {} } = action.payload

  if (typeof pageSize !== 'number') {
    return dispatch({ type: 'GET', payload: action.payload, meta: action.meta })
  }

  const data: unknown[] = []
  let page = getCurrentPage(action.payload)
  let paging: Payload | undefined = undefined
  let lastSize = -1
  let prevFirstId: string | null | undefined = null
  do {
    const response: Action = await dispatch(
      createAction(page++, action.payload, paging, data, action.meta)
    )
    if (response.response?.status !== 'ok') {
      // Stop and return errors right away
      return response
    }

    // Extract paging for next action
    const prevPaging = paging
    paging = createNextPaging(action.payload, response.response?.paging?.next)

    // Extract data
    const responseData = response.response?.data
    if (Array.isArray(responseData)) {
      if (!noLoopCheck) {
        const firstId = getFirstId(responseData)
        if (typeof firstId === 'string' && firstId === prevFirstId) {
          return {
            ...action,
            response: {
              ...action.response,
              status: 'error',
              error: 'GET_ALL detected a possible infinite loop',
            },
          }
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

  return { ...action, response: { ...action.response, status: 'ok', data } }
}
