import util from 'util'
import getHandler from './get.js'
import getField from '../utils/getField.js'
import { createErrorResponse } from '../utils/response.js'
import { getFirstIfArray } from '../utils/array.js'
import {
  Action,
  Response,
  Ident,
  IdentType,
  ActionHandlerResources,
} from '../types.js'
import { IdentConfigProps } from '../service/types.js'

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

const prepareResponse = (
  action: Action,
  response: Response,
  params: IdentParams,
  propKeys: PropKeys,
): Response => {
  const data = getFirstIfArray(response.data)

  if (data) {
    const completeIdent = {
      id: getField(data, propKeys.id) as string | undefined,
      roles: getField(data, propKeys.roles) as string[] | undefined, // TODO: Do some more validation here
      tokens: getField(data, propKeys.tokens) as string[] | undefined, // TODO: Do some more validation here
      isCompleted: true,
    }
    return wrapOk(action, data, completeIdent)
  } else {
    return createErrorResponse(
      `Could not find ident with params ${util.inspect(params)}, error: ${
        response.error
      }`,
      'handler:GET_IDENT',
      'notfound',
    )
  }
}

function extractParams(resources: ActionHandlerResources, ident: Ident) {
  const { identConfig } = resources.options
  const { type } = identConfig || {}
  const propKeys = preparePropKeys(identConfig?.props)
  const params = prepareParams(ident, propKeys)
  return { type, propKeys, params }
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

  const { type, propKeys, params } = extractParams(resources, ident)
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
  return prepareResponse(action, response, params, propKeys)
}
