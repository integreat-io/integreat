const { flatten } = require('ramda')
const mapAny = require('map-any')

/**
 * Map the data going _to_ the service. Everything is handled by the mappings,
 * but this method make sure that the right types are mapped.
 *
 * @param {Object} data - The data to map
 * @param {Object} options - mappings, params, onlyMappedValues, and endpoint
 * @returns {Object[]} Array of mapped items
 */
function mapFromService (response, { mappings, request, endpoint }) {
  const { params } = request
  const type = params.type || Object.keys(mappings)
  const { onlyMappedValues } = params

  const data = (endpoint && endpoint.responseMapper)
    ? endpoint.responseMapper(response)
    : response.data

  const mapType = (type) => (mappings[type])
    ? mappings[type].fromService({ data, params }, { onlyMappedValues })
    : []

  return {
    ...response,
    data: flatten(mapAny(mapType, type))
  }
}

module.exports = mapFromService
