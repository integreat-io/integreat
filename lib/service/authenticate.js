const is = require('@sindresorhus/is')

const generateErrorResponse = (status, error, access, authError) => ({
  status,
  error: (authError) ? `${error}: ${authError}` : error,
  access: { ...access, status: 'refused', scheme: 'service' }
})

const responseFromAuthentication = (authentication, response, { access }) => {
  switch (authentication.status) {
    case 'granted':
      return undefined
    case 'refused':
      return generateErrorResponse('noaccess', 'Authentication was refused', access)
    case 'error':
    case 'timeout':
      return generateErrorResponse('autherror', 'Could not authenticate', access, authentication.error)
  }

  return generateErrorResponse('autherror', 'Could not authenticate - unknown status from authenticator', access)
}

const requestFromAuthentication = (authentication, authenticator, adapter, request) => {
  if (authentication.status === 'granted') {
    const fn = authenticator[adapter.authentication]
    if (is.function(fn)) {
      const auth = fn(authentication)
      return { ...request, auth }
    }
  }

  return { ...request, auth: null }
}

const runAuthentication = async (authenticator, authOptions, retries = 1) => {
  const authentication = await authenticator.authenticate(authOptions)

  if (authentication.status === 'timeout' && retries > 0) {
    return runAuthentication(authenticator, authOptions, retries - 1)
  }

  return authentication
}

function authenticate ({ authenticator, authOptions, adapter }) {
  return (authenticator && authenticator.authenticate)
    ? async (args) => {
      const { authentication, response, request } = args
      if (authentication && authenticator.isAuthenticated(authentication)) {
        return args
      }

      const nextAuthentication = await runAuthentication(authenticator, authOptions)

      return {
        ...args,
        authentication: nextAuthentication,
        response: responseFromAuthentication(nextAuthentication, response, request),
        request: requestFromAuthentication(nextAuthentication, authenticator, adapter, request)
      }
    }
    : async (args) => args
}

module.exports = authenticate
