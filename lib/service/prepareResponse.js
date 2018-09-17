const authorizeItems = require('./authorizeItems')

const createUnmapped = (response, access) => {
  if (access.ident.root) {
    return {
      ...response,
      access: { ...access, scheme: 'unmapped' }
    }
  } else {
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
}

function prepareResponse (response, request, { schemas, unmapped = false } = {}) {
  const { data } = response
  const { action, auth } = request
  const access = response.access || request.access

  if (unmapped) {
    return createUnmapped(response, access)
  }

  const fromAuth = authorizeItems({ data, access, action, auth }, schemas)
  const status = (fromAuth.access && fromAuth.access.status === 'refused')
    ? 'noaccess' : response.status

  return { ...response, access, ...fromAuth, status }
}

module.exports = prepareResponse
