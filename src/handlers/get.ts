import debugLib from 'debug'
import pLimit from 'p-limit'
import { createErrorResponse, setResponseOnAction } from '../utils/action.js'
import createUnknownServiceError from '../utils/createUnknownServiceError.js'
import { isAuthorizedAction } from '../service/utils/authAction.js'
import type { Action, Response, ActionHandlerResources } from '../types.js'
import type Service from '../service/Service.js'
import type Endpoint from '../service/Endpoint.js'

const debug = debugLib('great')

const isErrorResponse = (response: Response) =>
  response.status !== 'ok' && response.status !== 'notfound'

const getIdFromAction = ({ payload: { id } }: Action) =>
  Array.isArray(id) && id.length === 1 ? id[0] : id

const combineResponses = (action: Action, responses: Response[]): Response =>
  responses.some(isErrorResponse)
    ? createErrorResponse(
        `One or more of the requests for ids ${getIdFromAction(
          action
        )} failed.`,
        'handler:GET'
      )
    : {
        ...action.response,
        status: 'ok',
        data: responses.map((response) =>
          Array.isArray(response.data) ? response.data[0] : response.data
        ),
      }

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
  createErrorResponse(
    `No endpoint matching ${action.type} request to service '${serviceId}'.`,
    'handler:GET',
    'badrequest'
  )

async function runAsIndividualActions(
  action: Action,
  service: Service,
  mapPerId: (endpoint: Endpoint) => (action: Action) => Promise<Response>
) {
  const actions = (action.payload.id as string[]).map((oneId) =>
    setIdOnActionPayload(action, oneId)
  )
  const endpoint = service.endpointFromAction(actions[0])
  if (!endpoint) {
    return createNoEndpointError(action, service.id)
  }
  return combineResponses(
    action,
    await Promise.all(
      actions.map((action) => pLimit(1)(() => mapPerId(endpoint)(action)))
    )
  )
}

const doRunIndividualIds = (action: Action, endpoint?: Endpoint) =>
  Array.isArray(action.payload.id) &&
  isAuthorizedAction(action) &&
  !isMembersScope(endpoint)

async function runOneOrMany(
  action: Action,
  service: Service,
  mapPerId: (endpoint: Endpoint) => (action: Action) => Promise<Response>
): Promise<Response> {
  const endpoint = service.endpointFromAction(action)
  if (doRunIndividualIds(action, endpoint)) {
    return runAsIndividualActions(action, service, mapPerId)
  }
  if (!endpoint) {
    return createNoEndpointError(action, service.id)
  }

  return mapPerId(endpoint)(action)
}

const runOne = (service: Service) => (endpoint: Endpoint) =>
  async function (action: Action) {
    const requestAction = await service.mutateRequest(action, endpoint)
    const response = await service.send(requestAction)
    return await service.mutateResponse(
      setResponseOnAction(action, response),
      endpoint
    )
  }

/**
 * Get several items from a service, based on the given action object.
 */
export default async function get(
  action: Action,
  { getService }: ActionHandlerResources
): Promise<Response> {
  const {
    type,
    targetService: serviceId,
    endpoint: endpointId,
  } = action.payload

  const id = getIdFromAction(action)
  if (Array.isArray(id) && id.length === 0) {
    return createErrorResponse(
      'GET action was dispatched with empty array of ids',
      'handler:GET',
      'noaction'
    )
  }

  const service = getService(type, serviceId)
  if (!service) {
    return createUnknownServiceError(type, serviceId, 'GET')
  }

  const endpointDebug = endpointId
    ? `endpoint '${endpointId}'`
    : `endpoint matching type '${type}' and id '${id}'`
  debug('GET: Fetch from service %s at %s', service.id, endpointDebug)

  const nextAction = setIdOnActionPayload(action, id)

  return await runOneOrMany(
    service.authorizeAction(nextAction),
    service,
    runOne(service)
  )
}
