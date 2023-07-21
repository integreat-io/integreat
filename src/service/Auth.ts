import type { AuthOptions, Authentication } from './types.js'
import type { Authenticator, Action, Response, Transporter } from '../types.js'
import { isObject } from '../utils/is.js'
import { createErrorResponse } from '../utils/action.js'

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

    try {
      // Validate authentication
      const ident = await this.#authenticator.validate(
        authentication,
        this.#options,
        action
      )

      // We got an ident back, so authentication was successful
      return { status: 'ok', access: { ident } }
    } catch (err) {
      // Validation failed, so return error
      return createErrorResponse(
        `Authentication was refused. ${
          err instanceof Error ? err.message : String(err)
        }`,
        this.id,
        'noaccess'
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
