import { MapTransform } from 'map-transform'
import { Exchange, Dictionary, DataObject } from '../../types'
import {
  mappingObjectFromExchange,
  exchangeFromMappingObject,
  MappingObject,
} from '../../utils/exchangeMapping'
import { Mappings } from './create'

const getMapperFn = (
  mapping: MapTransform | null | undefined,
  sendNoDefaults: boolean
) => (sendNoDefaults ? mapping?.rev.onlyMappedValues : mapping?.rev)

const mapOneType = (
  mappingObject: MappingObject,
  type: string,
  mappings: Mappings,
  sendNoDefaults: boolean
) => {
  const mapping =
    type && mappings.hasOwnProperty(type) ? mappings[type] : undefined // eslint-disable-line security/detect-object-injection
  const mapperFn = getMapperFn(mapping, sendNoDefaults)
  return typeof mapperFn === 'function' ? mapperFn(mappingObject) : undefined
}

const mapByType = (
  mapObject: MappingObject,
  type: string | string[],
  mappings: Mappings,
  sendNoDefaults: boolean
) =>
  Array.isArray(type)
    ? type.reduce(
        (target, aType) => ({
          ...target,
          ...mapOneType(mapObject, aType, mappings, sendNoDefaults),
        }),
        {} as DataObject
      )
    : mapOneType(mapObject, type, mappings, sendNoDefaults)

export default function mapRequest(
  requestMapper: MapTransform | null,
  mappings: Dictionary<MapTransform>,
  endpointSendNoDefaults = false
) {
  return (exchange: Exchange) => {
    const sendNoDefaults =
      exchange.request.sendNoDefaults ?? endpointSendNoDefaults
    const mappingObject = mappingObjectFromExchange(exchange, true)

    if (exchange.request.type) {
      mappingObject.data = mapByType(
        mappingObject,
        exchange.request.type,
        mappings,
        sendNoDefaults
      )
    }
    const mapperFn = getMapperFn(requestMapper, sendNoDefaults)
    if (typeof mapperFn === 'function') {
      const mapped = mapperFn(mappingObject)
      if (typeof mapped === 'object' && mapped !== null) {
        mappingObject.data = mapped.data
        mappingObject.status = mapped.status || mappingObject.status
        mappingObject.error = mapped.error || mappingObject.error
        if (mapped.hasOwnProperty('params')) {
          mappingObject.params = mapped.params
        }
        if (mapped.hasOwnProperty('paging')) {
          mappingObject.paging = mapped.paging
        }
      }
    }

    return exchangeFromMappingObject(exchange, mappingObject, true)
  }
}
