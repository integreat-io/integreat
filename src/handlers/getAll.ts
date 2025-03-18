import { createMetaForSubAction } from '../utils/action.js'
import { createErrorResponse, setOrigin } from '../utils/response.js'
import { isObject, isTypedData } from '../utils/is.js'
import type {
  Action,
  Response,
  Payload,
  Meta,
  ActionHandlerResources,
} from '../types.js'

const ORIGIN = 'handler:GET_ALL'

const extractLastId = (data: unknown, field = 'id') =>
  Array.isArray(data) && isObject(data[data.length - 1])
    ? // eslint-disable-next-line security/detect-object-injection
      data[data.length - 1] && data[data.length - 1][field]
    : undefined

const createAction = (
  page: number,
  { pageAfterField, ...payload }: Payload,
  paging?: Payload,
  data?: unknown,
  meta?: Meta,
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
            typeof pageAfterField === 'string' ? pageAfterField : undefined,
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
  { dispatch }: ActionHandlerResources,
): Promise<Response> {
  const { pageSize, noLoopCheck = false } = action.payload

  if (typeof pageSize !== 'number') {
    return createErrorResponse(
      'GET_ALL requires a pageSize',
      ORIGIN,
      'badrequest',
    )
  }

  const data: unknown[] = []
  let page = getCurrentPage(action.payload)
  let paging: Payload | undefined = undefined
  let lastSize = -1
  let prevFirstId: string | null | undefined = null
  do {
    const response = await dispatch(
      createAction(
        page++,
        action.payload,
        paging,
        data,
        createMetaForSubAction(action.meta),
      ),
    )
    if (response?.status !== 'ok') {
      // Stop and return errors right away
      return setOrigin(response, ORIGIN)
    }

    // Extract paging for next action
    const usePageId = !!paging || response?.paging?.next !== undefined
    paging = createNextPaging(action.payload, response?.paging?.next)

    // Extract data
    const responseData = response?.data
    if (Array.isArray(responseData)) {
      if (!noLoopCheck) {
        const firstId = getFirstId(responseData)
        if (typeof firstId === 'string' && firstId === prevFirstId) {
          return createErrorResponse(
            'GET_ALL detected a possible infinite loop',
            ORIGIN,
          )
        }
        prevFirstId = firstId
      }

      data.push(...responseData)
      lastSize = Array.isArray(responseData) ? responseData.length : 1
    }

    // If no data array or no new page token -- end this
    if (!Array.isArray(responseData) || (usePageId && !paging)) {
      lastSize = 0
    }
  } while (lastSize === pageSize)

  return { status: 'ok', data }
}
