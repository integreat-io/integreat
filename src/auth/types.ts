import { Dictionary, Data } from '../types'

export type AuthOptions = Dictionary<Data>

export interface Authentication extends AuthOptions {
  status: string
  error?: string
}

export interface Authenticator {
  authenticate: (options: AuthOptions | null) => Promise<Authentication>
  isAuthenticated: (authentication: Authentication | null) => boolean
  authentication: {
    [asFunction: string]: (authentication: Authentication | null) => object
  }
}

export interface AuthDef {
  id: string
  authenticator: string
  options: AuthOptions
}

export interface Auth {
  id: string
  authenticator: Authenticator | null
  options: AuthOptions
  authentication: null | Authentication
}
