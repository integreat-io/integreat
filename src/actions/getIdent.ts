import util = require('util')
import getField from '../utils/getField'
import createError from '../utils/createError'
import { exchangeFromAction } from '../utils/exchangeMapping'
import {
  Exchange,
  Dispatch,
  IdentConfig,
  Data,
  Ident,
  Dictionary,
} from '../types'
import { GetService } from '../dispatch'
import getHandler from './get'

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
const prepareParams = (ident: Ident, keys: Dictionary<string>) =>
  ident.id
    ? keys.id === 'id'
      ? { [keys.id]: ident.id }
      : { params: { [keys.id]: ident.id } }
    : ident.withToken
    ? { params: { [keys.tokens]: ident.withToken } }
    : null

const wrapOk = (exchange: Exchange, data: Data | Data[], ident: object) => ({
  ...exchange,
  status: 'ok',
  response: { ...exchange.response, data },
  ident,
})

const getFirstIfArray = (data: Data) => (Array.isArray(data) ? data[0] : data)

const prepareResponse = (
  exchange: Exchange,
  params: object,
  propKeys: Dictionary<string>
): Exchange => {
  const data = getFirstIfArray(exchange.response.data)

  if (data) {
    const completeIdent = {
      id: getField(data, propKeys.id),
      roles: getField(data, propKeys.roles),
      tokens: getField(data, propKeys.tokens),
    }
    return wrapOk(exchange, data, completeIdent)
  } else {
    return createError(
      exchange,
      `Could not find ident with params ${util.inspect(params)}, error: ${
        exchange.response.error
      }`,
      'notfound'
    )
  }
}

/**
 * Get an ident item from service, based on the meta.ident object on the action.
 */
export default async function getIdent(
  exchange: Exchange,
  dispatch: Dispatch,
  getService: GetService,
  identConfig?: IdentConfig
): Promise<Exchange> {
  const { ident } = exchange
  if (!ident) {
    return createError(
      exchange,
      'GET_IDENT: The request has no ident',
      'noaction'
    )
  }

  const { type } = identConfig || {}
  if (!type) {
    return createError(
      exchange,
      'GET_IDENT: Integreat is not set up with authentication',
      'noaction'
    )
  }

  const propKeys = preparePropKeys(identConfig?.props)
  const params = prepareParams(ident, propKeys)
  if (!params) {
    return createError(
      exchange,
      'GET_IDENT: The request has no ident with id or withToken',
      'noaction'
    )
  }

  const nextExchange = exchangeFromAction({
    type: 'GET',
    payload: { type, ...params },
    meta: { ident: { id: 'root', root: true } },
  })
  const responseExchange = await getHandler(nextExchange, dispatch, getService)

  return prepareResponse(responseExchange, params, propKeys)
}
