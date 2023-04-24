import { setErrorOnAction } from '../utils/action.js'
import { Action, Adapter } from '../types.js'

export interface Options extends Record<string, unknown> {
  includeHeaders?: boolean
}

function normalizeJson(data: unknown) {
  if (typeof data === 'string') {
    return JSON.parse(data)
  } else {
    return data
  }
}

function serializeJSON(data: unknown) {
  if (data !== null && data !== undefined) {
    return JSON.stringify(data)
  } else {
    return data
  }
}

const setActionData = (
  action: Action,
  payloadData: unknown,
  responseData: unknown
) => ({
  ...action,
  payload: {
    ...action.payload,
    ...(payloadData ? { data: payloadData } : {}),
  },
  ...(action.response && {
    response: {
      ...action.response,
      ...(responseData ? { data: responseData } : {}),
    },
  }),
})

const setJSONHeaders = (action: Action) => ({
  ...action,
  meta: {
    ...action.meta,
    headers: {
      ...(action.meta?.headers || {}),
      'Content-Type': 'application/json',
    },
  },
})

const adapter: Adapter = {
  prepareOptions({ includeHeaders = false }: Options, _serviceId) {
    return { includeHeaders }
  },

  async normalize(action, _options) {
    let payloadData, responseData

    try {
      payloadData = normalizeJson(action.payload.data)
    } catch {
      return setErrorOnAction(
        action,
        'Payload data was not valid JSON',
        'badrequest'
      )
    }
    try {
      responseData = normalizeJson(action.response?.data)
    } catch {
      return setErrorOnAction(
        action,
        'Response data was not valid JSON',
        'badresponse'
      )
    }

    return setActionData(action, payloadData, responseData)
  },

  async serialize(action, options: Options) {
    const payloadData = serializeJSON(action.payload.data)
    const responseData = serializeJSON(action.response?.data)

    const ret = setActionData(action, payloadData, responseData)

    return options.includeHeaders ? setJSONHeaders(ret) : ret
  },
}

export default adapter
