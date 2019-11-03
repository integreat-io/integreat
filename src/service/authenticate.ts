import { Adapter, Request } from '../types'
import { Auth, Authentication, Authenticator, AuthOptions } from '../auth/types'

const generateErrorResponse = (
  status: string,
  error: string,
  access?: object,
  authError?: string
) => ({
  status,
  error: authError ? `${error}: ${authError}` : error,
  access: { ...access, status: 'refused', scheme: 'service' }
})

const responseFromAuthentication = (
  authentication: Authentication,
  { access }: Request
) => {
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
  authentication: Authentication,
  authenticator: Authenticator,
  adapter: Adapter,
  request: Request
) => {
  if (authentication.status === 'granted') {
    const fn =
      authenticator.authentication &&
      authenticator.authentication[adapter.authentication]
    if (typeof fn === 'function') {
      const auth = fn(authentication)
      return { ...request, auth }
    }
  }

  return { ...request, auth: null }
}

const doAuthenticate = async (
  authenticator: Authenticator,
  authOptions: AuthOptions,
  retries = 1
) => {
  const authentication = await authenticator.authenticate(authOptions)

  if (authentication.status === 'timeout' && retries > 0) {
    return doAuthenticate(authenticator, authOptions, retries - 1)
  }

  return authentication
}

interface Options {
  adapter: Adapter
  auth: Auth
}

interface Args {
  request: Request
}

function authenticate({ auth, adapter }: Options) {
  const { authenticator } = auth
  return authenticator && authenticator.authenticate
    ? async (args: Args) => {
        const { authentication } = auth
        const { request } = args

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
          auth.options
        )
        auth.authentication = nextAuthentication

        return {
          ...args,
          response: responseFromAuthentication(nextAuthentication, request),
          request: requestFromAuthentication(
            nextAuthentication,
            authenticator,
            adapter,
            request
          )
        }
      }
    : async (args: Args) => args
}

export default authenticate
