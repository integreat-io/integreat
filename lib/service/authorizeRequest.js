const { doAuth, getScheme } = require('./authorizeScheme')
const authorizeItems = require('./authorizeItems')

const authItems = (request, schemas) => ({
  ...request,
  ...authorizeItems(request, schemas)
})

/**
 * Authorize the request according to the setting on the relevant schema.
 * Sets the access object with `status` property specifying whether access
 * is `granted` or `refused`, and returns the request.
 *
 * The access object also includes the `ident` and the  `scheme`used for
 * authentication.
 *
 * @param {Object} request - The request object to authorize
 * @param {Object} schemas - An object with all schemas that may be needed
 * @returns {Object} The request object with updated access object
 */
function authorizeRequest ({ schemas }) {
  return ({ request }) => {
    const { access = {}, params = {}, method } = request

    const { ident = null } = access

    if (ident && ident.root) {
      return authItems({ ...request, access: { status: 'granted', ident, scheme: 'root' } }, schemas)
    }
    if (!params.type) {
      return authItems({ ...request, access: { status: 'granted', ident, scheme: null } }, schemas)
    }

    const requireAuth = !!request.auth
    const schema = schemas[params.type]
    const scheme = getScheme(schema, method)
    const status = (doAuth(scheme, ident, requireAuth)) ? 'granted' : 'refused'

    return authItems({ ...request, access: { status, ident, scheme } }, schemas)
  }
}

module.exports = authorizeRequest
