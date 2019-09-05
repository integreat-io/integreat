const generateErrorResponse = (
  status: string,
  error: string,
  access,
  authError?: string
) => ({
  status,
  error: authError ? `${error}: ${authError}` : error,
  access: { ...access, status: 'refused', scheme: 'service' }
})

const responseFromAuthentication = (authentication, response, { access }) => {
  switch (authentication.status) {
    case 'granted':
      return undefined
    case 'refused':
      return generateErrorResponse(
        'noaccess',
        'Authentication was refused',
        access
      )
    case 'error':
    case 'timeout':
      return generateErrorResponse(
        'autherror',
        'Could not authenticate',
        access,
        authentication.error
      )
  }

  return generateErrorResponse(
    'autherror',
    'Could not authenticate - unknown status from authenticator',
    access
  )
}

const requestFromAuthentication = (
  authentication,
  authenticator,
  adapter,
  request
) => {
  if (authentication.status === 'granted') {
    const fn = authenticator[adapter.authentication]
    if (typeof fn === 'function') {
      const auth = fn(authentication)
      return { ...request, auth }
    }
  }

  return { ...request, auth: null }
}

const doAuthenticate = async (
  authenticator,
  authOptions,
  request,
  retries = 1
) => {
  const authentication = await authenticator.authenticate(authOptions, request)

  if (authentication.status === 'timeout' && retries > 0) {
    return doAuthenticate(authenticator, authOptions, request, retries - 1)
  }

  return authentication
}

function authenticate({
  authenticator,
  authOptions,
  setAuthentication = () => {},
  adapter
}) {
  return authenticator && authenticator.authenticate
    ? async args => {
        const { authentication, response, request } = args

        if (authentication && authenticator.isAuthenticated(authentication)) {
          return {
            ...args,
            request: requestFromAuthentication(
              authentication,
              authenticator,
              adapter,
              request
            )
          }
        }

        const nextAuthentication = await doAuthenticate(
          authenticator,
          authOptions,
          request
        )
        setAuthentication(nextAuthentication)

        return {
          ...args,
          authentication: nextAuthentication,
          response: responseFromAuthentication(
            nextAuthentication,
            response,
            request
          ),
          request: requestFromAuthentication(
            nextAuthentication,
            authenticator,
            adapter,
            request
          )
        }
      }
    : async args => args
}

export default authenticate
