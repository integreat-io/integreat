const authorizeItems = require('./authorizeItems')

function prepareResponse (response, request, datatypes) {
  const {data} = response
  const {action, auth} = request
  const access = response.access || request.access

  const fromAuth = authorizeItems({data, access, action, auth}, datatypes)
  const status = (fromAuth.access && fromAuth.access.status === 'refused')
    ? 'noaccess' : response.status

  return {...response, access, ...fromAuth, status}
}

module.exports = prepareResponse
