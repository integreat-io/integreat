import debugLib from 'debug'
import mutateAndSend from '../utils/mutateAndSend.js'
import {
  createErrorResponse,
  createUnknownServiceError,
} from '../utils/response.js'
import { getTypeAndId, setIdAndTypeOnAction } from './set.js'
import { deepMergeItems } from '../utils/deep.js'
import { isErrorResponse, isTypedData } from '../utils/is.js'
import type Endpoint from '../service/Endpoint.js'
import type Service from '../service/Service.js'
import type { Action, Response, ActionHandlerResources } from '../types.js'

const debug = debugLib('great')

const createGetAction = (action: Action) => ({ ...action, type: 'GET' })

const createSetAction = (action: Action, data: unknown) => ({
  ...action,
  type: 'SET',
  payload: { ...action.payload, data },
})

function isUpdateEndpoint(endpoint?: Endpoint): endpoint is Endpoint {
  const actionType = endpoint?.match?.action
  return Array.isArray(actionType)
    ? actionType.includes('UPDATE')
    : actionType === 'UPDATE'
}

async function dispatchAction(service: Service, action: Action) {
  const endpoint = await service.endpointFromAction(action)
  if (!endpoint) {
    return createErrorResponse(
      `No endpoint matching ${
        action.type === 'GET' ? 'UPDATE' : 'SET'
      } request to service '${service.id}'.`,
      'handler:UPDATE',
      'badrequest',
    )
  }
  const response = await mutateAndSend(service, endpoint, action)
  if (isErrorResponse(response)) {
    return { ...response, error: `UPDATE failed: ${response.error}` }
  } else {
    return response
  }
}

const updateDatesInItem = (original: unknown, merged: unknown) =>
  isTypedData(original) && isTypedData(merged)
    ? {
        ...merged,
        createdAt: original.createdAt,
        ...(merged.updatedAt ? { updatedAt: new Date() } : {}),
      }
    : merged

function keepCreatedAt(original: unknown, merged: unknown) {
  if (Array.isArray(original) && Array.isArray(merged)) {
    return original.map(
      (item, index) => updateDatesInItem(item, merged[index]), // eslint-disable-line security/detect-object-injection
    )
  } else {
    return updateDatesInItem(original, merged)
  }
}

async function updateWithGetAndSet(service: Service, action: Action) {
  const getAction = createGetAction(action)
  const getResponse = await dispatchAction(service, getAction)
  if (isErrorResponse(getResponse)) {
    return getResponse
  }

  let data
  try {
    data = keepCreatedAt(
      getResponse.data,
      deepMergeItems(getResponse.data, action.payload.data),
    )
  } catch (error) {
    return createErrorResponse(error, 'handler:UPDATE')
  }

  const setAction = createSetAction(action, data)
  return await dispatchAction(service, setAction)
}

/**
 * Update on or more items to a service, based on the given action object.
 */
export default async function update(
  action: Action,
  { getService }: ActionHandlerResources,
): Promise<Response> {
  const {
    data,
    targetService: serviceId,
    endpoint: endpointId,
  } = action.payload

  const { type, id } = getTypeAndId(action, data)

  const service = getService(type, serviceId)
  if (!service) {
    return createUnknownServiceError(type, serviceId, 'UPDATE')
  }

  const endpointDebug = endpointId ? `at endpoint '${endpointId}'` : ''
  debug('SET: Send to service %s %s', service.id, endpointDebug)

  const nextAction = setIdAndTypeOnAction(action, id, type)
  const endpoint = await service.endpointFromAction(nextAction)

  if (isUpdateEndpoint(endpoint)) {
    return await mutateAndSend(service, endpoint, nextAction)
  } else {
    return await updateWithGetAndSet(service, nextAction)
  }
}
