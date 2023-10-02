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

interface IdentParams extends Record<string, unknown> {
  id?: string
}

const preparePropKeys = ({
  id = 'id',
  roles = 'roles',
  tokens = 'tokens',
} = {}) => ({
  id,
  roles,
  tokens,
})

// Will set any key that is not `id` on a params object. Not necessarily the
// best way to go about this.
const prepareParams = (
  ident: Ident,
  keys: Record<string, string>,
): IdentParams | null =>
  ident.id
    ? { [keys.id]: ident.id }
    : ident.withToken
    ? { [keys.tokens]: ident.withToken }
    : null

const wrapOk = (action: Action, data: unknown, ident: Ident): Response => ({
  ...action.response,
  status: 'ok',
  data,
  access: { ident },
})

const prepareResponse = async (
  action: Action,
  response: Response,
  params: IdentParams,
  propKeys: Record<string, string>,
): Promise<Response> => {
  const data = getFirstIfArray(response.data)

  if (data) {
    const completeIdent = {
      id: await getField(data, propKeys.id),
      roles: await getField(data, propKeys.roles),
      tokens: await getField(data, propKeys.tokens),
      isCompleted: true,
    } as Ident // Force type because `getField()` returns `unknown`
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

  const { identConfig } = resources.options

  const { type } = identConfig || {}
  if (!type) {
    return createErrorResponse(
      'GET_IDENT: Integreat is not set up with authentication',
      'handler:GET_IDENT',
      'noaction',
    )
  }

  const propKeys = preparePropKeys(identConfig?.props)
  const params = prepareParams(ident, propKeys)
  if (!params) {
    return createErrorResponse(
      'GET_IDENT: The request has no ident with id or withToken',
      'handler:GET_IDENT',
      'noaction',
    )
  }

  const nextAction = {
    type: 'GET',
    payload: { type, ...params },
    meta: { ident: { id: 'root', root: true, type: IdentType.Root } }, // Set `root` flag here until we can remove it
  }
  const response = await getHandler(nextAction, resources)

  return await prepareResponse(action, response, params, propKeys)
}
