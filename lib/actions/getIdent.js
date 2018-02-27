const util = require('util')
const getField = require('../utils/getField')
const createError = require('../utils/createError')

const prepareParams = (ident, keys) =>
  (ident.id) ? {[keys.idKey]: ident.id}
    : (ident.withToken) ? {[keys.tokensKey]: ident.withToken}
    : null

const wrapOk = (data, ident) => ({status: 'ok', data, access: {status: 'granted', ident}})

/**
* Get an ident item from source, based on the meta.ident object on the action.
* @param {Object} action - Action object
* @param {Object} resources - Object with getSource and identOptions
* @returns {Object} Response object with ident item as data
 */
async function getIdent ({ident}, {getSource, identOptions = {}}) {
  if (!ident) {
    return createError('GET_IDENT: The request has no ident', 'noaction')
  }

  const {type, props: propKeys = {}} = identOptions
  if (!type) {
    return createError('GET_IDENT: Integreat is not set up with authentication', 'noaction')
  }
  const {
    id: idKey = 'id',
    roles: rolesKey = 'roles',
    tokens: tokensKey = 'tokens'
  } = propKeys

  const source = getSource(type)
  const params = prepareParams(ident, {idKey, rolesKey, tokensKey})
  if (!params) {
    return createError('GET_IDENT: The request has no ident with id or withToken', 'noaction')
  }

  const request = {
    action: 'GET',
    params: {type, ...params},
    access: {ident: {root: true}}
  }
  const {response} = await source.sendRequest(request)
  const {data} = response

  if (data && data[0]) {
    const completeIdent = {
      id: getField(data[0], idKey),
      roles: getField(data[0], rolesKey),
      tokens: getField(data[0], tokensKey)
    }
    return wrapOk(data[0], completeIdent)
  } else {
    return createError(`Could not find ident with type '${type}' params ${util.inspect(params)}`, 'notfound')
  }
}

module.exports = getIdent
