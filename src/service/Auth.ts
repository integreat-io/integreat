import { Authenticator, AuthOptions, Authentication } from './types'
import { Action, Transporter } from '../types'
import { isObject } from '../utils/is'

const MAX_RETRIES = 1

const shouldRetry = (
  authentication: Authentication | null,
  retryCount: number
) => authentication?.status === 'timeout' && retryCount < MAX_RETRIES

export default class Auth {
  readonly id: string
  #authenticator: Authenticator
  #options: AuthOptions
  #authentication: Authentication | null

  constructor(
    id: string,
    authenticator?: Authenticator,
    options?: AuthOptions
  ) {
    if (!authenticator) {
      throw new TypeError('Auth requires an authenticator')
    }

    this.id = id
    this.#authenticator = authenticator
    this.#options = options || {}
    this.#authentication = null
  }

  async authenticate(action: Action): Promise<boolean> {
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

  applyToAction(action: Action, transporter: Transporter): Action {
    const auth = this.#authentication
    if (!auth) {
      return {
        ...action,
        response: { ...action.response, status: 'noaccess' },
        meta: { ...action.meta, auth: null },
      }
    }

    if (auth.status === 'granted') {
      const authenticator = this.#authenticator
      const fn =
        isObject(authenticator?.authentication) &&
        typeof transporter.authentication === 'string' &&
        authenticator.authentication[transporter.authentication]
      return {
        ...action,
        meta: {
          ...action.meta,
          auth: typeof fn === 'function' ? fn(auth) : null,
        },
      }
    }

    const status = auth.status === 'refused' ? 'noaccess' : 'autherror'
    const error =
      auth.status === 'refused'
        ? `Authentication attempt for '${this.id}' was refused.`
        : `Could not authenticate '${this.id}'. [${auth.status}]`
    return {
      ...action,
      response: {
        ...action.response,
        status,
        error: [error, auth.error].filter(Boolean).join(' '),
      },
      meta: { ...action.meta, auth: null },
    }
  }
}
