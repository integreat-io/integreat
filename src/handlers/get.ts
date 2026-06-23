import debugLib from 'debug'
import pLimit from 'p-limit'
import {
  createErrorResponse,
  createUnknownServiceError,
  combineResponses,
  setOrigin,
} from '../utils/response.js'
import mutateAndSend from '../utils/mutateAndSend.js'
import { isObject } from '../utils/is.js'
import type {
  Action,
  Response,
  ActionHandlerResources,
  HandlerDispatch,
} from '../types.js'
import type Service from '../service/Service.js'

const debug = debugLib('great')

const isErrorResponse = (response: Response) =>
  isObject(response) &&
  response.status !== 'ok' &&
  response.status !== 'notfound' &&
  response.status !== 'noaction'

const hasId = ({ payload: { id } }: Action) => !!id

const getIdFromAction = ({ payload: { id } }: Action) =>
  Array.isArray(id) && id.length === 1 ? id[0] : id

function combineIndividualResponses(
  action: Action,
  responses: Response[],
): Response {
  const errorResponses = responses.filter(isErrorResponse)

  if (errorResponses.length > 0) {
    const combinedResponse = combineResponses(errorResponses)
    return setOrigin(
      {
        ...combinedResponse,
        error: `One or more of the requests for ids ${getIdFromAction(
          action,
        )} failed with the following error(s): ${combinedResponse.error}`,
      },
      'handler:GET',
    )
  } else {
    return {
      ...action.response,
      status: 'ok',
      data: responses.map((response) =>
        Array.isArray(response.data) ? response.data[0] : response.data,
      ),
    }
  }
}

const setIdOnActionPayload = (
  action: Action,
  id?: string | string[],
): Action => ({
  ...action,
  payload: { ...action.payload, id },
})

const createNoEndpointError = (action: Action, serviceId: string) =>
  createErrorResponse(
    `No endpoint matching ${action.type} request to service '${serviceId}'.`,
    'handler:GET',
    'badrequest',
  )

async function runAsIndividualActions(
  action: Action,
  service: Service,
  dispatch: HandlerDispatch,
) {
  const actions = (action.payload.id as string[]).map((individualId) =>
    setIdOnActionPayload(action, individualId),
  )

  // We can't get by id without an id, so any nullish or empty ids are skipped.
  // They'll simply yield `null` in the resulting data array. When no id is left
  // to dispatch, we return a `null` for every id.
  const representativeAction = actions.find(hasId)
  if (!representativeAction) {
    return combineIndividualResponses(
      action,
      actions.map(() => ({ status: 'noaction', data: null })),
    )
  }

  const endpoint = await service.endpointFromAction(representativeAction)
  if (!endpoint) {
    return createNoEndpointError(action, service.id)
  }

  const responses = await Promise.all(
    actions.map((individualAction) =>
      hasId(individualAction)
        ? pLimit(1)(() =>
            mutateAndSend(service, endpoint, individualAction, dispatch),
          )
        : { status: 'noaction', data: null },
    ),
  )

  return combineIndividualResponses(action, responses)
}

const isMembersAction = (action: Action) => Array.isArray(action.payload.id)

async function runOneOrMany(
  action: Action,
  service: Service,
  dispatch: HandlerDispatch,
): Promise<Response> {
  const endpoint = await service.endpointFromAction(action)
  if (!endpoint) {
    if (isMembersAction(action)) {
      // This is an action with an array of ids, and we got no members endpoint,
      // so instead we'll try and run the action for each id individually.
      return runAsIndividualActions(action, service, dispatch)
    } else {
      return createNoEndpointError(action, service.id)
    }
  } else {
    // We've got an endpoint that match the action, so run it
    return mutateAndSend(service, endpoint, action, dispatch)
  }
}

/**
 * Get several items from a service, based on the given action object.
 */
export default async function get(
  action: Action,
  { getService, dispatch }: ActionHandlerResources,
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
      'noaction',
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

  return await runOneOrMany(nextAction, service, dispatch)
}
