const getField = require('../getField')

function completeIdent (source, {type, props = {}}) {
  if (!source || !type) {
    return async (ident) => ident
  }

  const {
    id: idKey = 'id',
    roles: rolesKey = 'roles',
    tokens: tokensKey = 'tokens'
  } = props

  const prepareParams = (ident) =>
    (ident.id) ? {[idKey]: ident.id}
    : (ident.token) ? {[tokensKey]: ident.token}
    : null

  return async (ident) => {
    if (!ident || (ident.id && ident.tokens)) {
      return ident
    }

    const params = prepareParams(ident)
    if (!params) {
      return null
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
      return {
        id: getField(data[0], idKey),
        roles: getField(data[0], rolesKey),
        tokens: getField(data[0], tokensKey)
      }
    } else {
      return null
    }
  }
}

module.exports = completeIdent
