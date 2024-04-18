import ms from 'ms'
import { isAction, isObject } from '../utils/is.js'
import {
  IdentType,
  type Action,
  type Authenticator,
  type Payload,
} from '../types.js'
import type { Authentication, AuthOptions } from '../service/types.js'

export interface ActionAuthOptions extends AuthOptions {
  action?: string
  payload?: Payload
  expireIn?: number | string
}

const metaFromAction = ({
  meta: { ident, cid, id, queue, ...meta } = {},
}: Action) => ({
  ...meta,
  ident,
  cid,
})

const createActionFromOptions = (
  option: ActionAuthOptions | null,
  action: Action | null,
) =>
  option
    ? {
        type: option.action,
        payload: option.payload,
        meta: action
          ? metaFromAction(action)
          : { ident: { id: 'anonymous', type: IdentType.Anon } },
      }
    : null

function calculateExpire(expire: unknown, expireIn?: number | string) {
  if (typeof expire === 'number') {
    return expire
  }
  if (typeof expireIn === 'string') {
    expireIn = ms(expireIn)
  }
  if (typeof expireIn === 'number') {
    return Date.now() + expireIn
  }
  return undefined
}

const isValidAuthData = (data: unknown): data is Record<string, unknown> =>
  isObject(data) &&
  (isObject(data.auth) || data.auth === null || data.auth === undefined)

/**
 * The action auth strategy. An action defined in options is dispatched, and the
 * restulting response data should hold the actual `auth` object and an optional
 * `expire` timestamp.
 */
const actionAuth: Authenticator = {
  /**
   * Authenticate and return authentication object if authentication was
   * successful.
   * The action authenticator dispatches the action given in the options, and
   * will dispatch this action and use the `auth` in the response data as auth
   * object. An `expire` timestamp in the response data will also be used.
   */
  async authenticate(options: ActionAuthOptions | null, action, dispatch) {
    const authAction = createActionFromOptions(options, action)
    if (!isAction(authAction)) {
      return {
        status: 'refused',
        error: 'The options did not define a valid action',
      }
    }
    const response = await dispatch(authAction)
    if (response.status !== 'ok') {
      return {
        status: 'refused',
        error: `Auth action failed. [${response.status}] ${response.error}`,
      }
    }
    if (!isValidAuthData(response.data)) {
      return {
        status: 'refused',
        error: 'Auth action responded without a valid data object',
      }
    }

    const expire = calculateExpire(response.data.expire, options?.expireIn)
    return {
      status: 'granted',
      auth: response.data.auth ?? {},
      ...(expire ? { expire } : {}),
    }
  },

  /**
   * Check whether we've already ran authentication.
   */
  isAuthenticated(authentication, _options, _action) {
    return (
      authentication?.status === 'granted' &&
      (typeof authentication.expire !== 'number' ||
        authentication.expire > Date.now())
    )
  },

  authentication: {
    /**
     * Return an object with the information needed for authenticated requests
     * with this authenticator.
     */
    asObject(authentication: Authentication | null) {
      return actionAuth.isAuthenticated(authentication, null, null) &&
        isObject(authentication?.auth)
        ? authentication.auth
        : ({} as Record<string, unknown>)
    },

    /**
     * Return a headers object with the headers needed for authenticated
     * requests with this authenticator. There will be only one property, namely
     * `Authorization`, which will consist of the type and the token, the latter
     * encoded if the `encode` option is true.
     */
    asHttpHeaders(authentication: Authentication | null) {
      return actionAuth.authentication.asObject(authentication)
    },
  },
}

export default actionAuth
