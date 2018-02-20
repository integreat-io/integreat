const authorizeItem = require('./authorizeItem')

function authorizeItems ({data, access, action, auth}, datatypes) {
  const {ident = null, status} = access || {}

  if (status === 'refused' || !data || (Array.isArray(data) && data.length === 0)) {
    return {}
  }

  const requireAuth = !!auth

  const dataArray = [].concat(data)
  const authorized = dataArray
    .filter((item) => authorizeItem(item, {ident}, {datatypes, requireAuth, action}))

  const dataStatus = (dataArray.length === authorized.length) ? 'granted'
    : (authorized.length) ? 'partially' : 'refused'

  return {
    data: (Array.isArray(data)) ? authorized : authorized[0],
    access: {status: dataStatus, scheme: 'data', ident}
  }
}

module.exports = authorizeItems
