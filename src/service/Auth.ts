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

export default class Auth {
  readonly id: string
  #authenticator: Authenticator
  #options: AuthOptions
  #authentication: Authentication | null

  constructor(id: string, authenticator: Authenticator, options?: AuthOptions) {
    this.id = id
    this.#authenticator = authenticator
    this.#options = options || {}
    this.#authentication = null
  }

  async authenticate(action: Action | null): Promise<boolean> {
    if (
      this.#authentication?.status === 'granted' &&
      this.#authenticator.isAuthenticated(this.#authentication, action)
    ) {
      return true
    }

    let attempt = 0
    do {
      this.#authentication = await this.#authenticator.authenticate(
        this.#options,
        action
      )
    } while (shouldRetry(this.#authentication, attempt++))

    return this.#authentication?.status === 'granted'
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
    const auth = this.#authentication
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
    const auth = this.#authentication
    if (!auth) {
      return { status: 'noaccess' }
    }
    if (auth.status === 'granted') {
      return { status: 'ok' }
    }
    const status = auth.status === 'refused' ? 'noaccess' : 'autherror'
    const error =
      auth.status === 'refused'
        ? `Authentication attempt for '${this.id}' was refused.`
        : `Could not authenticate '${this.id}'. [${auth.status}]`
    return { status, error: [error, auth.error].filter(Boolean).join(' ') }
  }

  applyToAction(action: Action, transporter: Transporter): Action {
    const auth = this.#authentication
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
