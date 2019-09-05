import mapAny = require('map-any')
import { GenericData } from '../types'
import { SendOptions, Mappings, Request } from './types'

const flatten = (data: GenericData) =>
  Array.isArray(data)
    ? data.reduce(
        (flattened, data) =>
          Array.isArray(data) ? [...flattened, ...data] : [...flattened, data],
        [] as GenericData[]
      )
    : data

const removeDataProp = ({ data, ...response }) => response

const mapWithEndpoint = (responseMapper, response, actionType) => {
  if (
    responseMapper ||
    actionType.startsWith('GET') ||
    actionType === 'REQUEST'
  ) {
    return responseMapper ? responseMapper(response) : response
  } else {
    return {}
  }
}

const mapByType = (
  request: Request,
  mappings: Mappings,
  onlyMappedValues: boolean
) => (type: string) => {
  // eslint-disable-next-line security/detect-object-injection
  const mapping = mappings[type]
  return mapping
    ? onlyMappedValues
      ? mapping.onlyMappedValues(request)
      : mapping(request)
    : []
}

/**
 * Map the data coming _from_ the service. Everything is handled by the mappings,
 * but this method make sure that the right types are mapped.
 */
function mapFromService() {
  return ({ response, request, responseMapper, mappings }: SendOptions) => {
    if (response.status !== 'ok') {
      return response
    }

    const type = request.params.type || Object.keys(mappings)
    const { onlyMappedValues = true, unmapped = false } = request.params

    if (unmapped) {
      return response
    }

    const {
      data,
      status = response.status,
      error,
      paging,
      params
    } = mapWithEndpoint(responseMapper, response, request.action)

    if (status !== 'ok') {
      return removeDataProp({ ...response, status, error })
    }

    return {
      ...response,
      status,
      ...(paging ? { paging } : {}),
      ...(params ? { params } : {}),
      data: data
        ? flatten(
            mapAny(
              mapByType({ ...request, data }, mappings, onlyMappedValues),
              type
            )
          )
        : undefined
    }
  }
}

export default mapFromService
