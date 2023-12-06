import { pathGetter } from 'map-transform'
import { isObject } from '../utils/is.js'
import type { Authenticator, Action } from '../types.js'
import type { AuthOptions, Authentication } from '../service/types.js'

export interface ValidateOptions extends AuthOptions {
  identId?: string
}

// `pathGetter` is requiring state, so give the minimal state needed
const state = { context: [], value: undefined }

const compareValues = (expected: unknown | unknown[], value: unknown) =>
  expected !== undefined && Array.isArray(expected)
    ? expected.includes(value)
    : expected === value

const getIsMatchCount = (matches: [boolean, boolean][]) =>
  matches.filter(([match]) => !!match).length

const getHasPropsCount = (matches: [boolean, boolean][]) =>
  matches.filter(([, exists]) => !!exists).length

// Returns a tuple where the first boolean is `true` if the entries in `options`
// are all present with the expected values in the given action. The second
// boolean is `true` if any of the entries in `options` are present in the given
// action, even though they might not have the expected values.
function validateOptions(options: AuthOptions, action: Action | null) {
  if (action === null) {
    // There is no action, so we don't have a match and none of the expected
    // props are present
    return [false, false] // [isMatch, hasProps]
  }

  // Extract the paths and the expected values from the options object
  const pathAndExpectedArr = Object.entries(options)
  if (pathAndExpectedArr.length === 0) {
    // This is a match, although none of the expected props are present
    return [true, false] // [isMatch, hasProps]
  }

  // Extract the values at the paths from the action, and compare them to the
  // expected values. `matches` wil be an array of [isMatch, hasProp] tuples for
  // each path.
  const matches: [boolean, boolean][] = pathAndExpectedArr.map(function ([
    path,
    expected,
  ]) {
    const value = pathGetter(path)(action, state)
    return [compareValues(expected, value), value !== undefined] // [isMatch, hasProp]
  })

  // Count up the matches to return the expected flags
  return [
    getIsMatchCount(matches) === pathAndExpectedArr.length, // isMatch
    getHasPropsCount(matches) > 0, // hasProps
  ]
}

/**
 * The options authenticator. Will always be authenticated, and will return the
 * given options it is given as authentication.
 */
const optionsAuth: Authenticator = {
  /**
   * Authenticate and return authentication object if authentication was
   * successful.
   * Would normaly perform an authentication request and return the token
   * received, but in optionsAuth the given options object is returned as the
   * authentication object.
   */
  async authenticate(options) {
    return { status: 'granted', ...options }
  },

  /**
   * Check whether we've already ran authentication.
   * In the optionsAuth, this will always be true, as no authentication is
   * really necessary.
   */
  isAuthenticated(authentication, _options, _action) {
    return !!(authentication && authentication.status === 'granted')
  },

  /**
   * Validate authentication object.
   * The options authenticator will check that all the properties of the options
   * object (except `identId`) are present in the given action. If so, an ident
   * with the id provided in the `identId` option is returned. Otherwise, an
   * error response is returned.
   */
  async validate(_authentication, options: ValidateOptions | null, action) {
    const { identId, ...authOptions } = options || {}

    const [isValid, hasProps] = validateOptions(authOptions, action)
    if (isValid) {
      return { status: 'ok', access: { ident: { id: identId } } }
    } else {
      // The action was invalid, so return an error response. If the action had
      // none of the expected props, we return a noaccess error, as this means
      // no authentication was provided.
      return hasProps
        ? {
            status: 'autherror',
            error: 'Invalid credentials',
            reason: 'invalidauth',
          }
        : {
            status: 'noaccess',
            error: 'Authentication required',
            reason: 'noauth',
          }
    }
  },

  authentication: {
    /**
     * Return an object with the information needed for authenticated requests
     * with this strategy.
     * For OptionsStrategy, this will simply be the options object given on
     * creation.
     */
    asObject(authentication: Authentication | null): Record<string, unknown> {
      if (isObject(authentication)) {
        const { status, ...options } = authentication
        if (status === 'granted') {
          return options
        }
      }
      return {}
    },

    /**
     * Return a headers object with the headers needed for authenticated
     * requests with this strategy. For OptionsStrategy, this will simply be the
     * options object given on creation.
     */
    asHttpHeaders(
      authentication: Authentication | null,
    ): Record<string, unknown> {
      if (isObject(authentication)) {
        const { status, ...options } = authentication
        if (status === 'granted') {
          return options
        }
      }
      return {}
    },
  },
}

export default optionsAuth
