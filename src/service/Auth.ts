import type { Authenticator, AuthOptions, Authentication } from './types.js'
import type { Action, Transporter } from '../types.js'
import { isObject } from '../utils/is.js'

const MAX_RETRIES = 1

const shouldRetry = (
  authentication: Authentication | null,
  retryCount: number
) => authentication?.status === 'timeout' && retryCount < MAX_RETRIES

export interface StatusObject {
  status: string
  error?: string
}

const getKey = (
  authenticator: Authenticator,
  options: AuthOptions | null,
  action: Action | null
) =>
  typeof authenticator.extractAuthKey === 'function'
    ? authenticator.extractAuthKey(options, action) || ''
    : ''

export default class Auth {
  readonly id: string
  #authenticator: Authenticator
  #options: AuthOptions
  #authentications = new Map<string, Authentication>()

  constructor(id: string, authenticator: Authenticator, options?: AuthOptions) {
    this.id = id
    this.#authenticator = authenticator
    this.#options = options || {}
  }

  async authenticate(action: Action | null): Promise<boolean> {
    const key = getKey(this.#authenticator, this.#options, action)
    let authentication = this.#authentications.get(key)
    if (
      authentication?.status === 'granted' &&
      this.#authenticator.isAuthenticated(authentication, this.#options, action)
    ) {
      return true
    }

    let attempt = 0
    do {
      authentication = await this.#authenticator.authenticate(
        this.#options,
        action
      )
    } while (shouldRetry(authentication, attempt++))

    this.#authentications.set(key, authentication)
    return authentication?.status === 'granted'
  }

  async authenticateAndGetAuthObject(
    action: Action | null,
    method: string
  ): Promise<Record<string, unknown> | null> {
    // eslint-disable-next-line security/detect-object-injection
    const fn = this.#authenticator.authentication[method]

    if (typeof fn === 'function') {
      const auth = await this.#authenticator.authenticate(this.#options, action)
      if (auth.status === 'granted') {
        return fn(auth)
      } else {
        throw new Error(auth.error || 'Authentication failed')
      }
    }

    return null
  }

  getAuthObject(transporter: Transporter): Record<string, unknown> | null {
    const auth = this.#authentications.get('') // Only applies to `listen()` which doesn't support multi-user auth for now
    if (!auth || auth.status !== 'granted') {
      return null
    }

    const authenticator = this.#authenticator
    const fn =
      isObject(authenticator?.authentication) &&
      typeof transporter.authentication === 'string' &&
      authenticator.authentication[transporter.authentication]
    return typeof fn === 'function' ? fn(auth) : null
  }

  getStatusObject(): StatusObject {
    const auth = this.#authentications.get('') // Only applies to `listen()` which doesn't support multi-user auth for now
    if (!auth) {
      return {
        status: 'noaccess',
        error: `Trying to use auth '${this.id}' before authentication has been run`,
      }
    }
    if (auth.status === 'granted') {
      return { status: 'ok' }
    }
    const status = auth.status === 'refused' ? 'noaccess' : 'autherror'
    const error =
      auth.status === 'refused'
        ? `Authentication attempt for auth '${this.id}' was refused.`
        : `Could not authenticate auth '${this.id}'. [${auth.status}]`
    return { status, error: [error, auth.error].filter(Boolean).join(' ') }
  }

  applyToAction(action: Action, transporter: Transporter): Action {
    const key = getKey(this.#authenticator, this.#options, action)
    const auth = this.#authentications.get(key)
    if (auth?.status === 'granted') {
      return {
        ...action,
        meta: {
          ...action.meta,
          auth: this.getAuthObject(transporter),
        },
      }
    }

    return {
      ...action,
      response: {
        ...action.response,
        ...this.getStatusObject(),
      },
      meta: { ...action.meta, auth: null },
    }
  }
}
