import { ensureArray } from '../utils/array'
import { AccessDef, Access } from './types'

const allowedOrNone = (method: string) =>
  method === undefined || ['all', 'auth'].includes(method) ? method : 'none'

const massageAccessObject = ({
  actions,
  allow,
  role,
  ident,
  ...accessObject
}: AccessDef) => ({
  ...accessObject,
  ...(allow ? { allow: allowedOrNone(allow) } : {}),
  ...(ident ? { ident: ensureArray(ident) } : {}),
  ...(role ? { role: ensureArray(role) } : {}),
})

function getActionPrefix(action: string) {
  const index = action.indexOf('_')
  return index >= 0 ? action.substr(0, index) : action
}

function ensureAccessObject(access?: string | AccessDef | null) {
  if (typeof access === 'string') {
    return massageAccessObject({ allow: access })
  }
  if (typeof access === 'object' && access !== null) {
    return Object.keys(access).length > 0 ? massageAccessObject(access) : {}
  }
  return access === undefined ? {} : { allow: 'none' }
}

const getActionAccess = (access?: AccessDef | null, actionType?: string) =>
  typeof access?.actions === 'object' &&
  access?.actions != null &&
  typeof actionType === 'string'
    ? access.actions[getActionPrefix(actionType)] || access // eslint-disable-line security/detect-object-injection
    : access

export default function accessForAction(access?: string | AccessDef | null) {
  const accessObject = typeof access === 'string' ? { allow: access } : access
  return (actionType?: string): Access =>
    ensureAccessObject(getActionAccess(accessObject, actionType))
}
