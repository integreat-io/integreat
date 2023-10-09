import Auth from '../Auth.js'
import identAuth from '../../authenticators/ident.js'
import { ensureArray } from '../../utils/array.js'
import { isNotNullOrUndefined, isObject } from '../../utils/is.js'
import { setUpAuth } from '../../Instance.js'
import { lookupById } from '../../utils/indexUtils.js'
import type { Authenticator } from '../../types.js'
import type { AuthObject, AuthProp, AuthDef } from '../types.js'

const isAuthDef = (def: unknown): def is AuthDef =>
  isObject(def) &&
  typeof def.id === 'string' &&
  typeof def.authenticator === 'string'

export const resolveAuth = (
  authenticators: Record<string, Authenticator>,
  auths?: Record<string, Auth>,
) =>
  function resolveAuth(auth?: AuthObject | AuthProp): Auth | undefined {
    if (isObject(auth) && !!auth.outgoing) {
      auth = auth.outgoing
    }

    if (typeof auth === 'string') {
      return lookupById(auth, auths)
    } else if (isAuthDef(auth)) {
      return setUpAuth(authenticators)(auth)
    } else if (auth) {
      return new Auth('ident', identAuth, {})
    } else {
      return undefined
    }
  }

export const resolveIncomingAuth = (
  authenticators: Record<string, Authenticator>,
  auths?: Record<string, Auth>,
) =>
  function resolveIncomingAuth(auth?: AuthObject | AuthProp) {
    if (isObject(auth) && auth.incoming) {
      const incomingAuths = ensureArray(auth.incoming)
      return incomingAuths
        .map((incoming) => resolveAuth(authenticators, auths)(incoming))
        .filter(isNotNullOrUndefined)
    } else {
      return undefined
    }
  }
