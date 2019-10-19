import { Dictionary, Auth, AuthDef } from '../types'
import { Authenticator } from './types'

function getAuthenticator(
  id: string,
  authenticators?: Dictionary<Authenticator>
) {
  if (!authenticators) {
    throw new Error('No authenticators were supplied')
  }
  const authenticator = authenticators[id]
  if (!authenticator) {
    throw new Error(`Could not find the authenticator '${id}'`)
  }
  return authenticator
}

/*
 * Create an Auth object from an AuthDef, by looking up the authenticator.
 */
export default function createAuth(
  def?: AuthDef,
  authenticators?: Dictionary<Authenticator>
): Auth | undefined {
  if (!def) {
    return undefined
  }

  const { id, options = {} } = def
  const authenticator = getAuthenticator(def.authenticator, authenticators)

  return {
    id,
    authenticator,
    options,
    authentication: null
  }
}
