const authorizeItems = require('./authorizeItems')

const authorizeUnmapped = (response, access, mapResponseWithType) => {
  if (mapResponseWithType && !access.ident.root) {
    return {
      ...response,
      status: 'noaccess',
      access: {
        ...access,
        status: 'refused',
        scheme: 'unmapped'
      },
      data: []
    }
  }

  return {
    ...response,
    access: { ...access, scheme: 'unmapped' }
  }
}

const getStatus = (access, status) =>
  (access && access.status === 'refused') ? 'noaccess' : status

function authorizeResponse ({ schemas }) {
  return ({ response, request, mapResponseWithType = true }) => {
    if (response.status !== 'ok') {
      return response
    }

    const access = response.access || request.access

    if (!mapResponseWithType || (request.params && request.params.unmapped)) {
      return authorizeUnmapped(response, access, mapResponseWithType)
    }

    const authResult = authorizeItems({
      data: response.data,
      access,
      action: request.action,
      auth: request.auth
    }, schemas)

    const status = getStatus(authResult.access, response.status)

    return { ...response, access, ...authResult, status }
  }
}

module.exports = authorizeResponse
