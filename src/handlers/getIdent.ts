import util = require('util')
import getField from '../utils/getField'
import createError from '../utils/createError'
import { getFirstIfArray } from '../utils/array'
import { Action, InternalDispatch, Ident } from '../types'
import { IdentConfig } from '../service/types'
import { GetService } from '../dispatch'
import getHandler from './get'

interface IdentParams {
  id?: string
  params?: Record<string, string>
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
  keys: Record<string, string>
): IdentParams | null =>
  ident.id
    ? keys.id === 'id'
      ? { [keys.id]: ident.id }
      : { params: { [keys.id]: ident.id } }
    : ident.withToken
    ? { params: { [keys.tokens]: ident.withToken } }
    : null

const wrapOk = (action: Action, data: unknown, ident: Ident) => ({
  ...action,
  response: { ...action.response, status: 'ok', data },
  meta: { ...action.meta, ident },
})

const prepareResponse = (
  action: Action,
  params: IdentParams,
  propKeys: Record<string, string>
): Action => {
  const data = getFirstIfArray(action.response?.data)

  if (data) {
    const completeIdent = {
      id: getField(data, propKeys.id),
      roles: getField(data, propKeys.roles),
      tokens: getField(data, propKeys.tokens),
    } as Ident
    return wrapOk(action, data, completeIdent)
  } else {
    return createError(
      action,
      `Could not find ident with params ${util.inspect(params)}, error: ${
        action.response?.error
      }`,
      'notfound'
    )
  }
}

/**
 * Get an ident item from service, based on the meta.ident object on the action.
 */
export default async function getIdent(
  action: Action,
  dispatch: InternalDispatch,
  getService: GetService,
  identConfig?: IdentConfig
): Promise<Action> {
  const { ident } = action.meta || {}
  if (!ident) {
    return createError(
      action,
      'GET_IDENT: The request has no ident',
      'noaction'
    )
  }

  const { type } = identConfig || {}
  if (!type) {
    return createError(
      action,
      'GET_IDENT: Integreat is not set up with authentication',
      'noaction'
    )
  }

  const propKeys = preparePropKeys(identConfig?.props)
  const params = prepareParams(ident, propKeys)
  if (!params) {
    return createError(
      action,
      'GET_IDENT: The request has no ident with id or withToken',
      'noaction'
    )
  }

  const nextAction = {
    type: 'GET',
    payload: { type, ...params },
    meta: { ident: { id: 'root', root: true } },
  }
  const responseAction = await getHandler(nextAction, dispatch, getService)

  return prepareResponse(responseAction, params, propKeys)
}
