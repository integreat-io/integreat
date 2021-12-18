import debugLib = require('debug')
import pPipe = require('p-pipe')
import pLimit = require('p-limit')
import { createErrorOnAction } from '../utils/createError'
import createUnknownServiceError from '../utils/createUnknownServiceError'
import { Action, ActionHandlerResources } from '../types'
import { Service } from '../service/types'
import { Endpoint } from '../service/endpoints/types'

const debug = debugLib('great')
const limit = pLimit(1)

const isErrorAction = (action: Action) =>
  action.response?.status !== 'ok' && action.response?.status !== 'notfound'

const getIdFromAction = ({ payload: { id } }: Action) =>
  Array.isArray(id) && id.length === 1 ? id[0] : id

const combineActions = (action: Action, actions: Action[]) =>
  actions.some(isErrorAction)
    ? createErrorOnAction(
        action,
        `One or more of the requests for ids ${getIdFromAction(action)} failed.`
      )
    : {
        ...action,
        response: {
          ...action.response,
          status: 'ok',
          data: actions.map((action) =>
            Array.isArray(action.response?.data)
              ? action.response?.data[0]
              : action.response?.data
          ),
        },
      }

const isMembersScope = (endpoint?: Endpoint) =>
  endpoint?.match?.scope === 'members'

const setIdOnAction = (action: Action, id?: string | string[]): Action => ({
  ...action,
  payload: { ...action.payload, id },
})

const createNoEndpointError = (action: Action, serviceId: string) =>
  createErrorOnAction(
    action,
    `No endpoint matching ${action.type} request to service '${serviceId}'.`,
    'noaction'
  )

async function runAsIndividualActions(
  action: Action,
  service: Service,
  mapPerId: (endpoint: Endpoint) => (action: Action) => Promise<Action>
) {
  const actions = (action.payload.id as string[]).map((oneId) =>
    setIdOnAction(action, oneId)
  )
  const endpoint = service.endpointFromAction(actions[0])
  if (!endpoint) {
    return createNoEndpointError(action, service.id)
  }
  return combineActions(
    action,
    await Promise.all(
      actions.map((action) => limit(() => mapPerId(endpoint)(action)))
    )
  )
}

const doRunIndividualIds = (action: Action, endpoint?: Endpoint) =>
  Array.isArray(action.payload.id) &&
  action.meta?.authorized &&
  !isMembersScope(endpoint)

async function mapOneOrMany(
  action: Action,
  service: Service,
  mapPerId: (endpoint: Endpoint) => (action: Action) => Promise<Action>
): Promise<Action> {
  const endpoint = service.endpointFromAction(action)
  if (doRunIndividualIds(action, endpoint)) {
    return runAsIndividualActions(action, service, mapPerId)
  }
  if (!endpoint) {
    return createNoEndpointError(action, service.id)
  }

  return mapPerId(endpoint)(action)
}

/**
 * Get several items from a service, based on the given action object.
 */
export default async function get(
  action: Action,
  { getService }: ActionHandlerResources
): Promise<Action> {
  const {
    type,
    targetService: serviceId,
    endpoint: endpointId,
  } = action.payload

  const service =
    typeof getService === 'function' ? getService(type, serviceId) : null
  if (!service) {
    return createUnknownServiceError(action, type, serviceId, 'GET')
  }

  const id = getIdFromAction(action)

  const endpointDebug = endpointId
    ? `endpoint '${endpointId}'`
    : `endpoint matching type '${type}' and id '${id}'`
  debug('GET: Fetch from service %s at %s', service.id, endpointDebug)

  const nextAction = setIdOnAction(action, id)

  const mapPerId = (endpoint: Endpoint) =>
    pPipe(
      (action: Action) => service.mapRequest(action, endpoint),
      service.send,
      (action: Action) => service.mapResponse(action, endpoint)
    )

  return mapOneOrMany(service.authorizeAction(nextAction), service, mapPerId)
}
