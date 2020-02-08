const { flatten } = require('ramda')
const mapAny = require('map-any')

const mapWithEndpoint = (responseMapper, response, actionType) => {
  if (responseMapper || actionType.startsWith('GET') || actionType === 'REQUEST') {
    return (responseMapper) ? responseMapper(response) || {} : response
  } else {
    return {}
  }
}

/**
 * Map the data going _to_ the service. Everything is handled by the mappings,
 * but this method make sure that the right types are mapped.
 *
 * @param {Object} data - The data to map
 * @param {Object} options - mappings, params, onlyMappedValues, and endpoint
 * @returns {Object[]} Array of mapped items
 */
function mapFromService () {
  return ({ response, request, responseMapper, mappings, mapResponseWithType = true }) => {
    const type = request.params.type || Object.keys(mappings)
    const { onlyMappedValues, unmapped = false } = request.params

    if (unmapped) {
      return response
    }

    const {
      data,
      status = response.status,
      error = response.error,
      paging,
      params
    } = mapWithEndpoint(responseMapper, response, request.action)

    const ret = {
      ...response,
      status,
      ...(status !== 'ok' && error ? { error } : {}),
      ...((paging) ? { paging } : {}),
      ...((params) ? { params } : {}),
      ...(status === 'ok' || data ? { data: data === null ? undefined : data } : {})
    }

    if (status === 'ok' && data && mapResponseWithType) {
      const mapType = (type) => (mappings[type])
        ? mappings[type].fromService({ ...request, data }, { onlyMappedValues })
        : []
      ret.data = flatten(mapAny(mapType, type))
    }

    return ret
  }
}

module.exports = mapFromService
