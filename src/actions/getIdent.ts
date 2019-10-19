import util = require('util')
import getField from '../utils/getField'
import createError from '../utils/createError'
import createUnknownServiceError from '../utils/createUnknownServiceError'

const preparePropKeys = ({
  id = 'id',
  roles = 'roles',
  tokens = 'tokens'
} = {}) => ({
  id,
  roles,
  tokens
})

const prepareParams = (ident, keys) =>
  ident.id
    ? { [keys.id]: ident.id }
    : ident.withToken
    ? { [keys.tokens]: ident.withToken }
    : null

const wrapOk = (data, ident) => ({
  status: 'ok',
  data,
  access: { status: 'granted', ident }
})

const getFirstIfArray = data => (Array.isArray(data) ? data[0] : data)

const prepareResponse = (response, params, propKeys) => {
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
      `Could not find ident with params ${util.inspect(params)}`,
      'notfound'
    )
  }
}

/**
 * Get an ident item from service, based on the meta.ident object on the action.
 * @param action - Action object
 * @param resources - Object with getService and identConfig
 * @returns Response object with ident item as data
 */
async function getIdent({ meta }, _dispatch, getService, identConfig = {}) {
  if (!meta.ident) {
    return createError('GET_IDENT: The request has no ident', 'noaction')
  }

  const { type } = identConfig
  if (!type) {
    return createError(
      'GET_IDENT: Integreat is not set up with authentication',
      'noaction'
    )
  }

  const service = getService(type)
  if (!service) {
    return createUnknownServiceError(type, null, 'GET_IDENT')
  }

  const propKeys = preparePropKeys(identConfig.props)
  const params = prepareParams(meta.ident, propKeys)
  if (!params) {
    return createError(
      'GET_IDENT: The request has no ident with id or withToken',
      'noaction'
    )
  }

  const { response } = await service.send({
    type: 'GET',
    payload: { type, ...params },
    meta: { ident: { root: true } }
  })

  return prepareResponse(response, params, propKeys)
}

export default getIdent
