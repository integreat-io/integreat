import Auth from '../Auth.js'
import pProgress, { ProgressNotifier } from 'p-progress'
import { setErrorOnAction, setOrigin } from '../../utils/action.js'
import { isObject } from '../../utils/is.js'
import type {
  Action,
  Response,
  Ident,
  Dispatch,
  Middleware,
} from '../../types.js'

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

const isIdent = (ident: unknown): ident is Ident => isObject(ident)

async function authorizeIncoming(
  action: Action,
  serviceId: string,
  auth?: Auth | boolean
) {
  if (auth) {
    if (typeof auth === 'boolean') {
      return action
    }

    try {
      const ident = await auth.authenticateAndGetAuthObject(action, 'asObject')
      if (isIdent(ident)) {
        return { ...action, meta: { ...action.meta, ident } }
      }
    } catch (err) {
      return setErrorOnAction(action, err, `service:${serviceId}`, 'autherror')
    }
  }

  return { ...action, meta: { ...action.meta, ident: undefined } }
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

// TODO: Consider if there is an easier way to pass the `setProgress` method
// through to the caller, i.e. to preserve the PProgress
export default function dispatchIncoming(
  dispatch: Dispatch,
  middleware: Middleware,
  serviceId: string,
  auth?: Auth | boolean
) {
  return (action: Action | null) =>
    pProgress<Response>(async (setProgress) => {
      if (action) {
        const response = await middleware(
          dispatchWithProgress(dispatch, setProgress, serviceId)
        )(
          await authorizeIncoming(
            setServiceIdAsSourceServiceOnAction(action, serviceId),
            serviceId,
            auth
          )
        )

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
