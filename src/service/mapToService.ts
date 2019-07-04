const { groupBy, prop } = require('ramda')

const groupByType = groupBy(prop('type'))

const mapItems = (data, request, mapping, target) =>
  mapping ? mapping.toService({ ...request, data }, target) : target

const mapDataPerType = (typeArrays, request, mappings) =>
  Object.keys(typeArrays).reduce(
    (target, type) =>
      mapItems(typeArrays[type], request, mappings[type], target),
    undefined
  )

const mapData = (data, request, mappings) =>
  data
    ? Array.isArray(data)
      ? mapDataPerType(groupByType(data), request, mappings)
      : mapItems(data, request, mappings[data.type])
    : undefined

const applyEndpointMapper = (data, request, requestMapper) =>
  requestMapper ? requestMapper({ ...request, data }) : data

/**
 * Map the data coming _from_ the service. Everything is handled by the mappings,
 * but this method make sure that the right types are mapped.
 *
 * @param {Object} data - The data to map
 * @param {Object} mappings - The mappings to map with
 * @returns {Object} Mapped data
 */
function mapToService() {
  return ({ request, requestMapper, mappings }) => {
    const data = mapData(request.data, request, mappings)
    return {
      ...request,
      data: applyEndpointMapper(data, request, requestMapper)
    }
  }
}

export default mapToService
