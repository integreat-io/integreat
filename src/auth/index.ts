import { Dictionary } from '../types'
import { Authenticator, Auth, AuthDef } from './types'
import { lookupById } from '../utils/indexUtils'

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
  const authenticator = lookupById(def.authenticator, authenticators)
  if (typeof authenticator !== 'object' || authenticator === null) {
    throw new Error(`Unknown authenticator '${def.authenticator}'`)
  }

  return {
    id,
    authenticator,
    options,
    authentication: null
  }
}
