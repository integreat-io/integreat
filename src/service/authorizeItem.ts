import { doAuth, getScheme } from './authorizeScheme'
import getField from '../utils/getField'

const doAuthRoleFromField = (field, data, ident) => {
  const role = getField(data, field)
  const roles = ident.roles || []
  return roles.includes(role)
}

const doAuthIdentFromField = (field, data, ident) => {
  const identId = getField(data, field)
  return ident && ident.id === identId
}

const authorizeWithScheme = (item, scheme, ident, requireAuth) => {
  if (scheme) {
    if (scheme.roleFromField) {
      return doAuthRoleFromField(scheme.roleFromField, item, ident)
    } else if (scheme.identFromField) {
      return doAuthIdentFromField(scheme.identFromField, item, ident)
    }
  }

  return doAuth(scheme, ident, requireAuth)
}

/**
 * Authorize data in Integreat's internal data format, according to the setting
 * of the relevant schema(s). The provided `access` object may be coming from
 * `authorizeRequest()`, and if this is refused already, this method will refuse
 * right away.
 *
 * Will return an access object, with status `granted` when all items are
 * successfully authorized, and `refused` when none is. In the case that only
 * some of the items are granted, the status will pe `partially`, and an
 * `itemStatus` property on the access object will hold an array of each item'
 * status, in the same order as the data array.
 *
 * @param {Object} item - A data item to authorize against
 * @param {Object} access - The access object to authorize against
 * @param {Object} options - Dataypes, action, and requireAuth
 */
function authorizeItem(item, access, { schemas, action, requireAuth }) {
  const { ident, status } = access

  if (status === 'refused') {
    return false
  }

  if (!item || (ident && ident.root)) {
    return true
  }

  const schema = schemas[item.$type]
  const scheme = getScheme(schema, action)

  return authorizeWithScheme(item, scheme, ident, requireAuth)
}

export default authorizeItem
