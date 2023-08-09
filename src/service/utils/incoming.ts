import Auth from '../Auth.js'
import pProgress, { ProgressNotifier } from 'p-progress'
import { setErrorOnAction } from '../../utils/action.js'
import { createErrorResponse, setOrigin } from '../../utils/response.js'
import { isObject } from '../../utils/is.js'
import type { Authentication } from '../types.js'
import type {
  Action,
  Response,
  Ident,
  Dispatch,
  Middleware,
} from '../../types.js'

const identityFromIntegreat = Symbol('identityFromIntegreat')

const setServiceIdAsSourceServiceOnAction = (
  action: Action,
  serviceId: string
): Action => ({
  ...action,
  payload: {
    ...action.payload,
    sourceService: action.payload.sourceService || serviceId,
  },
})

const isIdent = (ident: unknown): ident is Ident =>
  isObject(ident) && typeof ident.id === 'string'

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
  const ident = action.meta?.ident
  if (!isIdent(ident)) {
    return setErrorOnAction(
      action,
      'Authentication was refused. No ident',
      `auth:service:${serviceId}`,
      'noaccess'
    )
  } else {
    return {
      ...action,
      meta: {
        ...action.meta,
        ident: isKnownIdent(ident) ? removeKnownIdentMarker(ident) : undefined, // Remove the marker if it's there, otherwise remove the ident
      },
    }
  }
}

const dispatchWithProgress = (
  dispatch: Dispatch,
  setProgress: ProgressNotifier,
  serviceId: string
) =>
  async function (action: Action): Promise<Response> {
    if (typeof action.response?.status === 'string') {
      return action.response
    }

    const p = dispatch(action)
    p.onProgress(setProgress)
    return setOrigin(await p, `service:${serviceId}`)
  }

async function runAuths(
  auths: Auth[],
  authentication: Authentication,
  action: Action | null
) {
  let response: Response | undefined = undefined
  for (const auth of auths) {
    response = await auth.validate(authentication, action)
    if (response.status !== 'noaccess' && response.access?.ident) {
      return response
    }
  }
  return response || { status: 'noaccess', error: 'No authentication was run' }
}

// Passed to the transporter.listen() method. Transporters will call this to
// get the ident to used when dispatching incoming actions.
export const authenticateCallback = (
  auths: Auth[] | undefined,
  serviceId: string
) =>
  async function authenticateFromListen(
    authentication: Authentication,
    action?: Action | null
  ) {
    if (auths === undefined) {
      return createErrorResponse(
        `Could not authenticate. Service '${serviceId}' has no incoming authenticator`,
        `auth:service:${serviceId}`,
        'noaction'
      )
    } else {
      const response = await runAuths(auths, authentication, action || null)
      return setOrigin(
        markIdentAsKnown(response),
        `auth:service:${serviceId}`,
        true
      )
    }
  }

// Passed to the transporter.listen() method. Transporters will dispatch
// incoming actions to this function.
export function dispatchIncoming(
  dispatch: Dispatch,
  middleware: Middleware,
  serviceId: string
) {
  return (action: Action | null) =>
    pProgress<Response>(async (setProgress) => {
      if (action) {
        const authorizedAction = await authorizeIncoming(
          setServiceIdAsSourceServiceOnAction(action, serviceId),
          serviceId
        )
        const response = await middleware(
          dispatchWithProgress(dispatch, setProgress, serviceId)
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
