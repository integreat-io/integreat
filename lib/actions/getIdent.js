const util = require('util')
const getField = require('../utils/getField')
const createError = require('../utils/createError')

const prepareParams = (ident, keys) =>
  (ident.id) ? {[keys.idKey]: ident.id}
    : (ident.withToken) ? {[keys.tokensKey]: ident.withToken}
    : null

const wrapOk = (data) => ({status: 'ok', data})

/**
* Get an ident item from source, based on the meta.ident object on the action.
* @param {Object} action - Action object
* @param {Object} resources - Object with getSource and identOptions
* @returns {Object} Response object with ident item as data
 */
async function getIdent ({ident}, {getSource, identOptions}) {
  if (!ident || (ident.id && ident.tokens)) {
    return wrapOk(ident)
  }

  const {type, props: propKeys = {}} = identOptions
  const {
    id: idKey = 'id',
    roles: rolesKey = 'roles',
    tokens: tokensKey = 'tokens'
  } = propKeys

  const source = getSource(type)
  const params = prepareParams(ident, {idKey, rolesKey, tokensKey})
  if (!params) {
    return wrapOk(null)
  }

  const request = source.prepareRequest({
    action: 'GET',
    type,
    params,
    ident: {id: '__great'}
  })
  const response = await source.retrieve(request)
  const mappedResponse = source.mapFromSource(response, {type, params})
  const {data} = mappedResponse

  if (data && data[0]) {
    return wrapOk({
      id: getField(data[0], idKey),
      roles: getField(data[0], rolesKey),
      tokens: getField(data[0], tokensKey)
    })
  } else {
    return createError(`Could not find ident with type '${type}' params ${util.inspect(params)}`, 'notfound')
  }
}

module.exports = getIdent
