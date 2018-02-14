const {
  grant,
  refuse,
  pending,
  grantIf,
  prepareAccess
} = require('./helpers')

const grantAuthed = (ident) => grantIf(ident && ident.id)
const grantRole = (ident, role) =>
  grantIf(ident.roles && ident.roles.includes(role))
const grantIdent = (ident, id) => grantIf(ident.id && ident.id === id)
const pendingIfIdent = (ident) => (ident) ? pending() : refuse()

const authorizeScheme = (ident, scheme, requireAuth) => {
  if (!scheme || typeof scheme === 'string') {
    // Handle short forms
    scheme = {access: scheme}
  }

  if (scheme.access === 'auth') {
    // Any: Grant anyone access, as long as they are authenticated
    return grantAuthed(ident)
  } else if (scheme.access === 'all') {
    // None: Grant anyone access
    return grant()
  } else if (scheme.access === 'none') {
    // None: Grant anyone access
    return refuse()
  } else if (scheme.roleFromField || scheme.identFromField) {
    return pendingIfIdent(ident)
  } else if (scheme.role) {
    // Role: Grant anyone with the role access
    return grantRole(ident, scheme.role)
  } else if (scheme.ident) {
    // Ident: Grant a specified ident access
    return grantIdent(ident, scheme.ident)
  } else if (!requireAuth) {
    // No access setting: Grant anyone access, as long as auth is not required by request
    return grant()
  }

  return refuse()
}

/**
 * Authorize the request according to the setting on the relevant datatype.
 * Returns an access object where the `status` property specifies whether access
 * is `granted`, `refused`, or `pending`. The last one means that the final
 * permission depends on the data coming from the request.
 *
 * The access object also includes the ident used for authentication. This is
 * the same object as was passed in with the request object.
 *
 * The access object should be set on the response object, and the response
 * should be authorized with `authorizeRequest`. This will update the `pending`
 * status.
 *
 * @param {Object} request - The request object to authorize
 * @param {Object} datatypes - An object with all datatypes that may be needed
 * @returns {Object} The access object
 */
function authorizeRequest (request, datatypes) {
  const {ident = null, params, action} = request

  if (ident && ident.root) {
    return prepareAccess(grant(), 'root', ident)
  }

  const requireAuth = !!request.auth
  const datatype = datatypes[params.type] || {}

  if (datatype && datatype.access) {
    const {actions} = datatype.access
    if (actions && actions[action]) {
      const access = authorizeScheme(ident, actions[action], requireAuth)
      return prepareAccess(access, actions[action], ident)
    }
  }

  const access = authorizeScheme(ident, datatype.access, requireAuth)
  return prepareAccess(access, datatype.access, ident)
}

module.exports = authorizeRequest
