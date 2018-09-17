const util = require('util')
const getField = require('../utils/getField')
const createError = require('../utils/createError')

const preparePropKeys = ({
  id = 'id',
  roles = 'roles',
  tokens = 'tokens'
} = {}) => ({
  id, roles, tokens
})

const prepareParams = (ident, keys) =>
  (ident.id) ? { [keys.id]: ident.id }
    : (ident.withToken) ? { [keys.tokens]: ident.withToken }
      : null

const wrapOk = (data, ident) => ({ status: 'ok', data, access: { status: 'granted', ident } })

const prepareResponse = (response, params, propKeys) => {
  const { data } = response

  if (data && data[0]) {
    const completeIdent = {
      id: getField(data[0], propKeys.id),
      roles: getField(data[0], propKeys.roles),
      tokens: getField(data[0], propKeys.tokens)
    }
    return wrapOk(data[0], completeIdent)
  } else {
    return createError(`Could not find ident with params ${util.inspect(params)}`, 'notfound')
  }
}

/**
* Get an ident item from service, based on the meta.ident object on the action.
* @param {Object} action - Action object
* @param {Object} resources - Object with getService and identOptions
* @returns {Object} Response object with ident item as data
 */
async function getIdent ({ ident }, { getService, identOptions = {} }) {
  if (!ident) {
    return createError('GET_IDENT: The request has no ident', 'noaction')
  }

  const { type } = identOptions
  if (!type) {
    return createError('GET_IDENT: Integreat is not set up with authentication', 'noaction')
  }

  const service = getService(type)
  const propKeys = preparePropKeys(identOptions.props)
  const params = prepareParams(ident, propKeys)
  if (!params) {
    return createError('GET_IDENT: The request has no ident with id or withToken', 'noaction')
  }

  const request = {
    action: 'GET',
    params: { type, ...params },
    access: { ident: { root: true } }
  }
  const { response } = await service.send(request)

  return prepareResponse(response, request.params, propKeys)
}

module.exports = getIdent
