import { Dictionary, Data, DataObject } from '../types'

export interface Authentication extends Dictionary<Data> {
  status: string
  error?: string
}

type Options = DataObject

export interface Authenticator {
  authenticate: (options: Options) => Promise<Authentication>
  isAuthenticated: (authentication: Authentication | null) => boolean
  authentication: {
    [asFunction: string]: (authentication: Authentication | null) => object
  }
}

export interface AuthDef {
  id: string
  authenticator: string
  options: { [key: string]: Data }
}

export interface Auth {
  id: string
  authenticator: Authenticator
  options: { [key: string]: Data }
}
