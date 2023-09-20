import {
  arrayIncludes,
  ensureArray,
  ensureArrayOrUndefined,
} from '../../utils/array.js'
import type { Action, Ident } from '../../types.js'
import type { AccessDef, Access } from '../../schema/types.js'
import type Schema from '../../schema/Schema.js'

const authorizedByIntegreat = Symbol('authorizedByIntegreat')

export const isAuthorizedAction = (
  action: Action & { meta?: { [authorizedByIntegreat]?: boolean } },
) => action.meta && action.meta[authorizedByIntegreat] // eslint-disable-line security/detect-object-injection

export const setAuthorizedMark = (action: Action, isAuthorized = true) => ({
  ...action,
  meta: { ...action.meta, [authorizedByIntegreat]: isAuthorized },
})

const isRoot = (ident?: Ident) => Boolean(ident?.root)

function authorizeByAllow(allow?: string, hasIdent = false) {
  switch (allow) {
    case undefined:
    case 'all':
      return undefined
    case 'auth':
      return hasIdent ? undefined : 'NO_IDENT'
    default:
      // including 'none'
      return 'ALLOW_NONE'
  }
}

const hasFromFields = (access: AccessDef) =>
  typeof access.identFromField === 'string' ||
  typeof access.roleFromField === 'string'

const authMethods = [
  'allow',
  'ident',
  'role',
  'identFromField',
  'roleFromField',
]
const isAuthMethod = (method: string) => authMethods.includes(method)
const hasAuthMethod = (access: AccessDef) =>
  Object.keys(access).filter(isAuthMethod).length > 0

const createRequiredError = (items: string[], itemName: string) =>
  `Authentication was refused, ${itemName}${
    items.length > 1 ? 's' : ''
  } required: ${items.map((item) => `'${item}'`).join(', ')}`

function authorizeByFromField(type: string, ident?: Ident) {
  if (ident) {
    // Grant for now when we have `identFromField` or `roleFromField`, as we
    // can't refuse until we have the data
    return undefined
  } else {
    // Refuse, as we can't grant without an ident
    return {
      reason: 'NO_IDENT',
      error: `Authentication was refused for type '${type}'`,
    }
  }
}

export function validateRoleOrIdent(
  required?: string | string[],
  present?: string | string[],
) {
  const rolesArr = ensureArray(required)
  return (
    rolesArr.length > 0 &&
    arrayIncludes(rolesArr, ensureArrayOrUndefined(present))
  )
}

export function authorizeByRoleOrIdent(access: Access, ident?: Ident) {
  if (
    (!access.role && !access.ident) ||
    validateRoleOrIdent(access.role, ident?.roles) ||
    validateRoleOrIdent(access.ident, ident?.id)
  ) {
    // We require no ident or role, or we have a matching ident or role
    return undefined
  } else {
    // Refused, so return the reason and error. If both ident and role has
    // refused, we'll return `WRONG_IDENT` as the reason.
    return access.ident
      ? {
          reason: 'WRONG_IDENT',
          error: createRequiredError(ensureArray(access.ident), 'ident'),
        }
      : {
          reason: 'MISSING_ROLE',
          error: createRequiredError(ensureArray(access.role), 'role'),
        }
  }
}

function authorizeByOneSchema(
  ident: Ident | undefined,
  schema: Schema | undefined,
  type: string,
  actionType: string,
  requireAuth: boolean,
) {
  if (!schema) {
    return {
      reason: 'NO_SCHEMA',
      error: `Authentication was refused for type '${type}'`,
    }
  }

  const access = schema.accessForAction(actionType)
  if (requireAuth && !hasAuthMethod(access)) {
    return {
      reason: 'ACCESS_METHOD_REQUIRED',
      error: `Authentication was refused for type '${type}'`,
    }
  }

  const allowReason = authorizeByAllow(access.allow, !!ident?.id)
  if (allowReason) {
    return {
      reason: allowReason,
      error: `Authentication was refused for type '${type}'`,
    }
  }

  if (hasFromFields(access)) {
    // We have `identFromField` or `roleFromField`, so we can't refuse until we
    // have the data – unless already know that we have no ident
    return authorizeByFromField(type, ident)
  }

  return authorizeByRoleOrIdent(access, ident)
}

function authorizeBySchema(
  ident: Ident | undefined,
  schemas: Map<string, Schema>,
  actionTypes: string[],
  action: string,
  requireAuth: boolean,
) {
  for (const actionType of actionTypes) {
    const error = authorizeByOneSchema(
      ident,
      schemas.get(actionType),
      actionType,
      action,
      requireAuth,
    )
    if (error) {
      return error
    }
  }
  return { reason: undefined, error: undefined }
}

export default (schemas: Map<string, Schema>, requireAuth: boolean) =>
  function authorizeAction(action: Action): Action {
    const {
      payload: { type },
      response: { status } = {},
      meta: { ident } = {},
    } = action

    // Don't authenticate a request with an existing error
    if (typeof status === 'string' && status !== 'ok') {
      return setAuthorizedMark(action, false) // Don't authorize
    }

    // Authenticate if not root
    if (!isRoot(ident)) {
      const types = ensureArray(type)

      // Always allow requests without type
      if (types.length > 0) {
        const { reason, error } = authorizeBySchema(
          ident,
          schemas,
          types,
          action.type,
          requireAuth,
        )
        // If we have got reason or error, the authentication failed
        if (reason || error) {
          return setAuthorizedMark(
            {
              ...action,
              response: {
                ...action.response,
                status: 'noaccess',
                error,
                reason,
                origin: 'auth:action',
              },
            },
            false, // Don't authorize
          )
        }
      }
    }

    // Authenticated
    return setAuthorizedMark(action) // Autorize
  }
