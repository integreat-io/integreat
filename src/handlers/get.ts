import debugLib from 'debug'
import pPipe from 'p-pipe'
import pLimit from 'p-limit'
import { setResponseOnAction, setErrorOnAction } from '../utils/action.js'
import createUnknownServiceError from '../utils/createUnknownServiceError.js'
import type { Action, ActionHandlerResources } from '../types.js'
import type { Service } from '../service/types.js'
import type { Endpoint } from '../service/endpoints/types.js'

const debug = debugLib('great')

const isErrorAction = (action: Action) =>
  action.response?.status !== 'ok' && action.response?.status !== 'notfound'

const getIdFromAction = ({ payload: { id } }: Action) =>
  Array.isArray(id) && id.length === 1 ? id[0] : id

const combineActions = (action: Action, actions: Action[]) =>
  actions.some(isErrorAction)
    ? setErrorOnAction(
        action,
        `One or more of the requests for ids ${getIdFromAction(action)} failed.`
      )
    : setResponseOnAction(action, {
        ...action.response,
        status: 'ok',
        data: actions.map((action) =>
          Array.isArray(action.response?.data)
            ? action.response?.data[0]
            : action.response?.data
        ),
      })

const isMembersScope = (endpoint?: Endpoint) =>
  endpoint?.match?.scope === 'members'

const setIdOnActionPayload = (
  action: Action,
  id?: string | string[]
): Action => ({
  ...action,
  payload: { ...action.payload, id },
})

const createNoEndpointError = (action: Action, serviceId: string) =>
  setErrorOnAction(
    action,
    `No endpoint matching ${action.type} request to service '${serviceId}'.`,
    'badrequest'
  )

async function runAsIndividualActions(
  action: Action,
  service: Service,
  mapPerId: (endpoint: Endpoint) => (action: Action) => Promise<Action>
) {
  const actions = (action.payload.id as string[]).map((oneId) =>
    setIdOnActionPayload(action, oneId)
  )
  const endpoint = service.endpointFromAction(actions[0])
  if (!endpoint) {
    return createNoEndpointError(action, service.id)
  }
  return combineActions(
    action,
    await Promise.all(
      actions.map((action) => pLimit(1)(() => mapPerId(endpoint)(action)))
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

  const id = getIdFromAction(action)
  if (Array.isArray(id) && id.length === 0) {
    return setErrorOnAction(
      action,
      'GET action was dispatched with empty array of ids',
      'noaction'
    )
  }

  const service = getService(type, serviceId)
  if (!service) {
    return createUnknownServiceError(action, type, serviceId, 'GET')
  }

  const endpointDebug = endpointId
    ? `endpoint '${endpointId}'`
    : `endpoint matching type '${type}' and id '${id}'`
  debug('GET: Fetch from service %s at %s', service.id, endpointDebug)

  const nextAction = setIdOnActionPayload(action, id)

  const mapPerId = (endpoint: Endpoint) =>
    pPipe(
      (action: Action) => service.mapRequest(action, endpoint),
      service.send,
      (action: Action) => service.mapResponse(action, endpoint)
    )

  const { response } = await mapOneOrMany(
    service.authorizeAction(nextAction),
    service,
    mapPerId
  )

  return setResponseOnAction(action, response)
}
