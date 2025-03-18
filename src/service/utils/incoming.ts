import Auth from '../Auth.js'
import pProgress, { ProgressNotifier } from 'p-progress'
import { setErrorOnAction, setActionIds } from '../../utils/action.js'
import { createErrorResponse, setOrigin } from '../../utils/response.js'
import { isObject } from '../../utils/is.js'
import { completeIdent } from '../../utils/completeIdent.js'
import type { Authentication } from '../types.js'
import type {
  Action,
  Response,
  Ident,
  Dispatch,
  Middleware,
} from '../../types.js'
import type Service from '../Service.js'

const identityFromIntegreat = Symbol('identityFromIntegreat')

const setServiceIdAsSourceServiceOnAction = (
  action: Action,
  serviceId: string,
): Action => ({
  ...action,
  payload: {
    ...action.payload,
    sourceService: serviceId,
  },
})

const isIdent = (ident: unknown): ident is Ident =>
  isObject(ident) &&
  (typeof ident.id === 'string' ||
    typeof ident.withToken === 'string' ||
    (Array.isArray(ident.withToken) && typeof ident.withToken[0] === 'string'))

const isKnownIdent = (ident: Ident & { [identityFromIntegreat]?: boolean }) =>
  ident[identityFromIntegreat] === true // eslint-disable-line security/detect-object-injection

function markIdentAsKnown(response: Response) {
  const ident = response.access?.ident
  if (isIdent(ident)) {
    return {
      ...response,
      access: {
        ...response.access,
        ident: { ...ident, [identityFromIntegreat]: true },
      },
    }
  } else {
    return response
  }
}

const removeKnownIdentMarker = ({
  [identityFromIntegreat]: _,
  ...identWithoutMarker
}: Ident & { [identityFromIntegreat]?: boolean }) => identWithoutMarker

async function authorizeIncoming(action: Action, serviceId: string) {
  if (typeof action.response?.status === 'string') {
    return action
  }
  const ident = action.meta?.ident
  if (!isIdent(ident)) {
    return setErrorOnAction(
      action,
      'Authentication was refused. No ident',
      `auth:service:${serviceId}`,
      'noaccess',
    )
  } else {
    return {
      ...action,
      meta: {
        ...action.meta,
        ident: isKnownIdent(ident) ? removeKnownIdentMarker(ident) : undefined, // Remove the marker if it's there, otherwise remove the ident
        auth: undefined, // Accept no incoming ident
      },
    }
  }
}

const dispatchWithProgress = (
  dispatch: Dispatch,
  setProgress: ProgressNotifier,
  serviceId: string,
) =>
  async function (action: Action): Promise<Response> {
    const p = dispatch(action)
    p.onProgress(setProgress)
    const response = await p
    return setOrigin(response, `service:${serviceId}`)
  }

async function runAuths(
  auths: Auth[],
  authentication: Authentication,
  action: Action | null,
  dispatch: Dispatch,
) {
  let response: Response | undefined = undefined
  for (const auth of auths) {
    response = await auth.validate(authentication, action, dispatch)
    if (response.status !== 'noaccess' && response.access?.ident) {
      return response
    }
  }
  return response || { status: 'noaccess', error: 'No authentication was run' }
}

async function getAuthsFromAction(service: Service, action?: Action | null) {
  if (!action) {
    return undefined
  }
  const endpoint = await service.endpointFromAction(action, true)
  return endpoint?.incomingAuth
}

async function runAuthsAndCompleteIdent(
  dispatch: Dispatch,
  authentication: Authentication,
  shouldCompleteIdent: boolean,
  auths: Auth[],
  action?: Action | null,
) {
  const response = await runAuths(
    auths,
    authentication,
    action || null,
    dispatch,
  )
  if (shouldCompleteIdent) {
    return await completeIdent(response.access?.ident, dispatch)
  } else {
    return response
  }
}

// Passed to the transporter.listen() method. Transporters will call this to
// get the ident to used when dispatching incoming actions.
export const authenticateCallback = (
  service: Service,
  dispatch: Dispatch,
  shouldCompleteIdent: boolean,
  incomingAuth?: Auth[],
) =>
  async function authenticateFromListen(
    authentication: Authentication,
    action?: Action | null,
  ) {
    const auths = (await getAuthsFromAction(service, action)) || incomingAuth
    if (auths) {
      const response = await runAuthsAndCompleteIdent(
        dispatch,
        authentication,
        shouldCompleteIdent,
        auths,
        action,
      )
      return setOrigin(
        markIdentAsKnown(response),
        `auth:service:${service.id}`,
        true,
      )
    } else {
      return createErrorResponse(
        `Could not authenticate. Service '${service.id}' has no incoming authenticator`,
        `auth:service:${service.id}`,
        'noaction',
      )
    }
  }

// Passed to the transporter.listen() method. Transporters will dispatch
// incoming actions to this function.
export function dispatchIncoming(
  dispatch: Dispatch,
  middleware: Middleware,
  serviceId: string,
) {
  return (action: Action | null) =>
    pProgress<Response>(async (setProgress) => {
      if (action) {
        const authorizedAction = await authorizeIncoming(
          setServiceIdAsSourceServiceOnAction(setActionIds(action), serviceId),
          serviceId,
        )
        const response = await middleware(
          dispatchWithProgress(dispatch, setProgress, serviceId),
        )(authorizedAction)
        return (
          setOrigin(response, `middleware:service:${serviceId}`) || {
            status: 'error',
            origin: `service:${serviceId}`,
          }
        )
      } else {
        return {
          status: 'noaction',
          error: 'No action was dispatched',
          origin: `service:${serviceId}`,
        }
      }
    })
}
