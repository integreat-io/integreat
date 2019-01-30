const { flatten } = require('ramda')
const mapAny = require('map-any')

const removeDataProp = ({ data, ...response }) => response

const mapWithEndpoint = (responseMapper, response, actionType) => {
  if (responseMapper || actionType.startsWith('GET') || actionType === 'REQUEST') {
    return (responseMapper) ? responseMapper(response) : response
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
  return ({ response, request, responseMapper, mappings }) => {
    if (response.status !== 'ok') {
      return response
    }

    const type = request.params.type || Object.keys(mappings)
    const { onlyMappedValues, unmapped = false } = request.params

    if (unmapped) {
      return response
    }

    const { data, status = response.status, error, paging, params } =
      mapWithEndpoint(responseMapper, response, request.action)

    if (status !== 'ok') {
      return removeDataProp({ ...response, status, error })
    }

    const mapType = (type) => (mappings[type])
      ? mappings[type].fromService({ ...request, data }, { onlyMappedValues })
      : []

    return {
      ...response,
      status,
      ...((paging) ? { paging } : {}),
      ...((params) ? { params } : {}),
      data: (data) ? flatten(mapAny(mapType, type)) : undefined
    }
  }
}

module.exports = mapFromService
