import util = require('util')
import getField from '../utils/getField'
import createError from '../utils/createError'
import {
  Action,
  Dispatch,
  IdentConfig,
  Data,
  Ident,
  Response,
  Dictionary
} from '../types'
import { GetService } from '../dispatch'
import getHandler from './get'

const preparePropKeys = ({
  id = 'id',
  roles = 'roles',
  tokens = 'tokens'
} = {}) => ({
  id,
  roles,
  tokens
})

// Will set any key that is not `id` on a params object. Not necessarily the
// best way to go about this.
const prepareParams = (ident: Ident, keys: Dictionary<string>) =>
  ident.id
    ? keys.id === 'id'
      ? { [keys.id]: ident.id }
      : { params: { [keys.id]: ident.id } }
    : ident.withToken
    ? { params: { [keys.tokens]: ident.withToken } }
    : null

const wrapOk = (data: Data | Data[], ident: object) => ({
  status: 'ok',
  data,
  access: { status: 'granted', ident }
})

const getFirstIfArray = (data: Data) => (Array.isArray(data) ? data[0] : data)

const prepareResponse = (
  response: Response,
  params: object,
  propKeys: Dictionary<string>
) => {
  const data = getFirstIfArray(response.data)

  if (data) {
    const completeIdent = {
      id: getField(data, propKeys.id),
      roles: getField(data, propKeys.roles),
      tokens: getField(data, propKeys.tokens)
    }
    return wrapOk(data, completeIdent)
  } else {
    return createError(
      `Could not find ident with params ${util.inspect(params)}, error: ${
        response.error
      }`,
      'notfound'
    )
  }
}

/**
 * Get an ident item from service, based on the meta.ident object on the action.
 */
export default async function getIdent(
  { meta }: Action,
  dispatch: Dispatch,
  getService: GetService,
  identConfig?: IdentConfig
) {
  if (!meta?.ident) {
    return createError('GET_IDENT: The request has no ident', 'noaction')
  }

  const { type } = identConfig || {}
  if (!type) {
    return createError(
      'GET_IDENT: Integreat is not set up with authentication',
      'noaction'
    )
  }

  const propKeys = preparePropKeys(identConfig?.props)
  const params = prepareParams(meta.ident, propKeys)
  if (!params) {
    return createError(
      'GET_IDENT: The request has no ident with id or withToken',
      'noaction'
    )
  }

  const action = {
    type: 'GET',
    payload: { type, ...params },
    meta: { ident: { id: 'root', root: true } }
  }
  const response = await getHandler(action, dispatch, getService)

  return prepareResponse(response, params, propKeys)
}
