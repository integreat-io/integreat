import { doAuth, getScheme } from './authorizeScheme'
import authorizeItems from './authorizeItems'

const authItems = (request, schemas) => ({
  ...request,
  ...authorizeItems(request, schemas)
})

const authItemsAndWrap = (request, access, schemas) => {
  const nextRequest = authItems({ ...request, access }, schemas)

  if (nextRequest.access.status === 'refused') {
    return {
      request: nextRequest,
      response: {
        status: 'noaccess',
        error: 'Request not allowed',
        access: nextRequest.access
      }
    }
  }
  return { request: nextRequest }
}

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
function authorizeRequest({ schemas }) {
  return ({ request }) => {
    const { access = {}, params = {}, action } = request

    const { ident = null } = access

    if (ident && ident.root) {
      return authItemsAndWrap(
        request,
        { status: 'granted', ident, scheme: 'root' },
        schemas
      )
    }
    if (!params.type) {
      return authItemsAndWrap(
        request,
        { status: 'granted', ident, scheme: null },
        schemas
      )
    }

    const requireAuth = !!request.auth
    const schema = schemas[params.type]
    const scheme = getScheme(schema, action)
    const status = doAuth(scheme, ident, requireAuth) ? 'granted' : 'refused'

    return authItemsAndWrap(request, { status, ident, scheme }, schemas)
  }
}

export default authorizeRequest
