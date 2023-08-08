import type { AuthOptions, Authentication } from './types.js'
import type { Authenticator, Action, Response, Transporter } from '../types.js'
import { isObject } from '../utils/is.js'
import { createErrorResponse } from '../utils/action.js'

const MAX_RETRIES = 1

const shouldRetry = (
  authentication: Authentication | null,
  retryCount: number
) => authentication?.status === 'timeout' && retryCount < MAX_RETRIES

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

  async validate(
    authentication: Authentication,
    action: Action | null
  ): Promise<Response> {
    if (typeof this.#authenticator.validate !== 'function') {
      // Authenticator doesn't support validation, so return error
      return createErrorResponse(
        `Could not authenticate. Authenticator '${
          this.#authenticator.id
        }' doesn't support validation`,
        this.id,
        'autherror'
      )
    }

    if (authentication.status !== 'granted') {
      // Authentication has already been refused, so return error
      return createErrorResponse(
        'Authentication was refused',
        this.id,
        'noaccess'
      )
    }

    // Validate authentication
    const response = await this.#authenticator.validate(
      authentication,
      this.#options,
      action
    )

    if (response.status === 'ok' && response.access?.ident) {
      // We got an ident back, so authentication was successful
      return response
    } else {
      // Validation failed, so return error
      return createErrorResponse(
        `Authentication was refused. ${response.error}`,
        this.id,
        response.status || 'autherror',
        response.reason
      )
    }
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

  getAuthObject(
    transporter: Transporter,
    key = ''
  ): Record<string, unknown> | null {
    const auth = this.#authentications.get(key)
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

  getResponseFromAuth(key = ''): Response {
    const auth = this.#authentications.get(key)
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
          auth: this.getAuthObject(transporter, key),
        },
      }
    }

    return {
      ...action,
      response: {
        ...action.response,
        ...this.getResponseFromAuth(key),
      },
      meta: { ...action.meta, auth: null },
    }
  }
}
