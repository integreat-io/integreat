const {doAuth, getScheme} = require('./authorizeScheme')

/**
 * Authorize the request according to the setting on the relevant datatype.
 * Sets the access object with `status` property specifying whether access
 * is `granted` or `refused`, and returns the request.
 *
 * The access object also includes the `ident` and the  `scheme`used for
 * authentication.
 *
 * @param {Object} request - The request object to authorize
 * @param {Object} datatypes - An object with all datatypes that may be needed
 * @returns {Object} The request object with updated access object
 */
function authorizeRequest (request, datatypes) {
  const {access = {}, params = {}, action} = request

  const {ident = null} = access

  if (ident && ident.root) {
    return {...request, access: {status: 'granted', ident, scheme: 'root'}}
  }
  if (!params.type) {
    return {...request, access: {status: 'granted', ident, scheme: null}}
  }

  const requireAuth = !!request.auth
  const datatype = datatypes[params.type]
  const scheme = getScheme(datatype, action)
  const status = (doAuth(scheme, ident, requireAuth)) ? 'granted' : 'refused'

  return {...request, access: {status, ident, scheme}}
}

module.exports = authorizeRequest
