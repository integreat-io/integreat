const { flatten } = require('ramda')
const mapAny = require('map-any')

const removeDataProp = ({ data, ...response }) => response

/**
 * Map the data going _to_ the service. Everything is handled by the mappings,
 * but this method make sure that the right types are mapped.
 *
 * @param {Object} data - The data to map
 * @param {Object} options - mappings, params, onlyMappedValues, and endpoint
 * @returns {Object[]} Array of mapped items
 */
function mapFromService ({ mappings }) {
  return ({ response, request, endpoint }) => {
    if (response.status !== 'ok') {
      return response
    }

    const { params } = request
    const type = params.type || Object.keys(mappings)
    const { onlyMappedValues, unmapped = false } = params

    if (unmapped) {
      return response
    }

    const { data = null, status = response.status, error } =
      (endpoint && endpoint.responseMapper)
        ? endpoint.responseMapper(response)
        : response

    if (status !== 'ok') {
      return removeDataProp({ ...response, status, error })
    }

    const mapType = (type) => (mappings[type])
      ? mappings[type].fromService({ ...request, data }, { onlyMappedValues })
      : []

    return {
      ...response,
      status,
      data: flatten(mapAny(mapType, type))
    }
  }
}

module.exports = mapFromService
