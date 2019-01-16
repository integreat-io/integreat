const authorizeItem = require('./authorizeItem')

const hasData = (data) => (Array.isArray(data)) ? data.length > 0 : !!data
const getStatusForData = (original, authorized) =>
  (original.length === authorized.length) ? 'granted'
    : (authorized.length) ? 'partially' : 'refused'

function authorizeItems (request, schemas) {
  const { data, access, action, auth } = request
  const { ident = null, status } = access || {}

  if (status === 'refused' || !hasData(data)) {
    return {}
  }

  const requireAuth = !!auth

  const original = [].concat(data)
  const authorized = original
    .filter((item) => authorizeItem(item, { ident }, { schemas, requireAuth, action }))

  return {
    data: (Array.isArray(data)) ? authorized : authorized[0],
    access: {
      status: getStatusForData(original, authorized),
      scheme: 'data',
      ident
    }
  }
}

module.exports = authorizeItems
