const {
  grant,
  refuse,
  grantIf
} = require('./helpers')

const getField = (data, field) => data[field] || data.attributes[field] ||
  (data.relationships[field] && data.relationships[field].id)

const grantRoleFromField = (ident, data, field) => {
  const role = getField(data, field)
  const roles = ident.roles || []
  return grantIf(roles.includes(role), ident)
}

const grantIdentFromField = (ident, data, field) => {
  const identId = getField(data, field)
  return grantIf(ident && ident.id === identId)
}

const grantScheme = (data, ident, scheme, requireAuth) => {
  if (scheme.roleFromField) {
    return grantRoleFromField(ident, data, scheme.roleFromField)
  } else if (scheme.identFromField) {
    return grantIdentFromField(ident, data, scheme.identFromField)
  }

  return (requireAuth) ? refuse() : grant()
}

const getAccess = (access = {}, method) =>
  (access.actions && access.actions[method]) ? access.actions[method] : access

/**
 * Authorize data in Integreat's internal data format, according to the setting
 * of the relevant datatype(s). The provided `access` object may be coming from
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
 * @param {Object} options - Dataypes, method, and requireAuth
 */
function authorizeItem (item, access, {datatypes, method, requireAuth}) {
  const {ident, status} = access

  if (status === 'refused') {
    return access
  }

  if (!item) {
    return {...grant(), ident}
  }

  const datatype = datatypes[item.type]
  const scheme = getAccess(datatype.access, method)
  return {...grantScheme(item, ident, scheme, requireAuth), ident}
}

module.exports = authorizeItem
