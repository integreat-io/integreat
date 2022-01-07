const { flatten } = require('ramda')
const mapAny = require('map-any')

const mergeWithParams = (response, params) => ({
  ...response,
  params: {
    ...params,
    ...response.params,
  },
})

const mapWithEndpoint = (responseMapper, response, params, actionType) => {
  if (
    responseMapper ||
    actionType.startsWith('GET') ||
    actionType === 'REQUEST'
  ) {
    return responseMapper
      ? responseMapper(mergeWithParams(response, params)) || {}
      : response
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
function mapFromService() {
  return ({
    response,
    request,
    responseMapper,
    mappings,
    mapResponseWithType = true,
  }) => {
    const type = request.params.type || Object.keys(mappings)
    const { onlyMappedValues, unmapped = false } = request.params

    if (unmapped) {
      return response
    }

    const { data, status, error, paging, params } = mapWithEndpoint(
      responseMapper,
      response,
      request.params,
      request.action
    )

    const responseError = [response.error, error].filter(Boolean).join(' | ')
    const responseStatus =
      response.status !== 'ok'
        ? response.status
        : status || (responseError ? 'error' : 'ok')

    const ret = {
      ...response,
      status: responseStatus,
      ...(responseError ? { error: responseError } : {}),
      ...(paging ? { paging } : {}),
      ...(params ? { params } : {}),
      ...(responseStatus === 'ok' || data
        ? { data: data === null ? undefined : data }
        : {}),
    }

    if (ret.status === 'ok' && data && mapResponseWithType) {
      const mapType = (type) =>
        mappings[type]
          ? mappings[type].fromService(
              { ...request, data },
              { onlyMappedValues }
            )
          : []
      ret.data = flatten(mapAny(mapType, type))
    }

    return ret
  }
}

module.exports = mapFromService
