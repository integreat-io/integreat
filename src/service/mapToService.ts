import R = require('ramda')
import { MapTransform } from 'map-transform'
import { Data, DataObject } from '../types'
import { SendOptions, Mappings, Request } from './types'

const { groupBy, prop, mergeDeepWith } = R

const groupByType = groupBy(prop('$type'))

const concatOrRight = (left, right) =>
  Array.isArray(left) ? left.concat(right) : right

const mapIt = (
  mapper: MapTransform,
  request: Request,
  target: Data = null
) => {
  const { onlyMappedValues = true } = request.params
  const mapped = onlyMappedValues
    ? mapper.rev.onlyMappedValues(request)
    : mapper.rev(request)
  return (
    (target
      ? Array.isArray(target)
        ? [...target].concat(mapped)
        : mergeDeepWith(concatOrRight, target, mapped) // TODO: Move merging to MapTransform
      : mapped) || null
  )
}
const mapItems = (
  data: Data,
  request: Request,
  mapping: Mappings,
  target?: Data
) => (mapping ? mapIt(mapping, { ...request, data }, target) : target)

const mapDataPerType = (
  typeArrays: DataObject,
  request: Request,
  mappings: Mappings
) =>
  Object.keys(typeArrays).reduce(
    (target, type) =>
      mapItems(typeArrays[type], request, mappings[type], target), // eslint-disable-line security/detect-object-injection
    undefined
  )

const mapData = (data: Data, request: Request, mappings: Mappings) =>
  data
    ? Array.isArray(data)
      ? mapDataPerType(groupByType(data), request, mappings)
      : mapItems(data, request, mappings[data.$type])
    : undefined

const applyEndpointMapper = (request: Request, requestMapper?: MapTransform) =>
  requestMapper ? requestMapper.rev(request) : request

/**
 * Map the data going _to_ the service. Everything is handled by the mappings,
 * but this method make sure that the right types are mapped.
 */
function mapToService() {
  return ({ request, requestMapper, mappings }: SendOptions) => {
    const data = mapData(request.data, request, mappings)
    return {
      ...request,
      ...applyEndpointMapper({ ...request, data }, requestMapper)
    }
  }
}

export default mapToService
