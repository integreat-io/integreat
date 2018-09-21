const { groupBy, prop } = require('ramda')

const groupByType = groupBy(prop('type'))

const mapItems = (data, mapping, target) =>
  (mapping) ? mapping.toService(data, target) : target

const mapDataPerType = (typeArrays, mappings) => Object.keys(typeArrays).reduce(
  (target, type) => mapItems(typeArrays[type], mappings[type], target),
  undefined
)

const mapData = (data, mappings) => (data)
  ? (Array.isArray(data))
    ? mapDataPerType(groupByType(data), mappings)
    : mapItems(data, mappings[data.type])
  : undefined

const applyEndpointMapper = (data, request, endpoint) => (endpoint && endpoint.requestMapper)
  ? endpoint.requestMapper({ ...request, data })
  : data

/**
* Map the data coming _from_ the service. Everything is handled by the mappings,
* but this method make sure that the right types are mapped.
*
* @param {Object} data - The data to map
* @param {Object} mappings - The mappings to map with
* @returns {Object} Mapped data
 */
function mapToService (request, { mappings, endpoint }) {
  const data = mapData(request.data, mappings)
  return {
    ...request,
    data: applyEndpointMapper(data, request, endpoint)
  }
}

module.exports = mapToService
