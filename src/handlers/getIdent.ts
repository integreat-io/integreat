import util from 'util'
import getHandler from './get.js'
import getField from '../utils/getField.js'
import { createErrorResponse } from '../utils/response.js'
import { getFirstIfArray } from '../utils/array.js'
import { isTypedData } from '../utils/is.js'
import {
  IdentType,
  Action,
  Response,
  Ident,
  ActionHandlerResources,
  TypedData,
} from '../types.js'
import type { IdentConfigProps } from '../service/types.js'

interface IdentParams extends Record<string, unknown> {
  id?: string
}

interface PropKeys {
  id: string
  roles: string | null
  tokens: string | null
}

const createGetIdentAction = (type: string, params: IdentParams) => ({
  type: 'GET',
  payload: { type, ...params },
  meta: { ident: { id: 'root', root: true, type: IdentType.Root } }, // Set `root` flag here until we can remove it
})

const preparePropKeys = ({
  id = 'id',
  roles = 'roles',
  tokens = 'tokens',
}: IdentConfigProps = {}): PropKeys => ({
  id,
  roles,
  tokens,
})

// Will set any key that is not `id` on a params object. Not necessarily the
// best way to go about this.
const prepareParams = (ident: Ident, keys: PropKeys): IdentParams | null =>
  ident.id
    ? { [keys.id]: ident.id }
    : ident.withToken
      ? { [keys.tokens!]: ident.withToken } // If we get here, the tokens key is a string
      : null

const wrapOk = (action: Action, data: unknown, ident: Ident): Response => ({
  ...action.response,
  status: 'ok',
  data,
  access: { ident },
})

const setPropOnIdent = (data: TypedData) =>
  function setPropOnIdent(
    props: Record<string, unknown>,
    [key, path]: [string, unknown],
    _index: number,
  ) {
    if (typeof path === 'string') {
      const value = getField(data, path)
      if (value !== undefined) {
        return { ...props, [key]: value }
      }
    }
    return props
  }

const prepareResponse = (
  action: Action,
  response: Response,
  params: IdentParams,
  mapping: Record<string, unknown>,
): Response => {
  const data = getFirstIfArray(response.data)

  if (response.status === 'ok' && isTypedData(data)) {
    const identProps = Object.entries(mapping).reduce<Record<string, unknown>>(
      setPropOnIdent(data),
      {},
    )
    return wrapOk(action, data, {
      id: undefined, // Always include id. Will be overridden if it is present in `identProps`
      ...identProps,
      isCompleted: true, // Set `isCompleted` so we don't try to complete again
    })
  } else if (
    typeof response.status === 'string' &&
    ['ok', 'notfound'].includes(response.status) // When we get 'ok' here, it's because the data was not typed data'
  ) {
    return createErrorResponse(
      `Could not find ident with params ${util.inspect(params)}. [notfound] ${
        response.error || 'Did not return the expected data'
      }`,
      'handler:GET_IDENT',
      'notfound',
    )
  } else {
    return createErrorResponse(
      `Could not get ident with params ${util.inspect(params)}. [${response.status}] ${
        response.error
      }`,
      'handler:GET_IDENT',
    )
  }
}

function extractParams(resources: ActionHandlerResources, ident: Ident) {
  const { identConfig } = resources.options
  const { type } = identConfig || {}
  const propKeys = preparePropKeys(identConfig?.props)
  const params = prepareParams(ident, propKeys)
  const mapping = { ...propKeys, ...identConfig?.mapping }
  return { type, propKeys, params, mapping }
}

/**
 * Get an ident item from service, based on the meta.ident object on the action.
 */
export default async function getIdent(
  action: Action,
  resources: ActionHandlerResources,
): Promise<Response> {
  const { ident } = action.meta || {}
  if (!ident) {
    return createErrorResponse(
      'GET_IDENT: The request has no ident',
      'handler:GET_IDENT',
      'noaction',
    )
  }

  if (ident.isCompleted) {
    return wrapOk(action, ident, ident) // Return the ident as-is
  }

  const { type, propKeys, params, mapping } = extractParams(resources, ident)
  if (!type) {
    return createErrorResponse(
      'GET_IDENT: Integreat is not set up with authentication',
      'handler:GET_IDENT',
      'noaction',
    )
  }
  if (typeof ident.withToken === 'string' && !propKeys.tokens) {
    return createErrorResponse(
      "GET_IDENT: The request has an ident with 'withToken', but no tokens key is set in `identConfig`",
      'handler:GET_IDENT',
      'badrequest',
    )
  }
  if (!params) {
    return createErrorResponse(
      'GET_IDENT: The request has no ident with id or withToken',
      'handler:GET_IDENT',
      'noaction',
    )
  }

  const response = await getHandler(
    createGetIdentAction(type, params),
    resources,
  )
  return prepareResponse(action, response, params, mapping)
}
