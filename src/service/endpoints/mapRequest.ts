import { MapTransform } from 'map-transform'
import { Exchange, Dictionary, DataObject } from '../../types'
import {
  mappingObjectFromExchange,
  exchangeFromMappingObject,
  MappingObject,
} from '../../utils/exchangeMapping'
import { Mappings } from './create'

const mapOneType = (
  mappingObject: MappingObject,
  type: string,
  mappings: Mappings
) => {
  const mapping =
    type && mappings.hasOwnProperty(type) ? mappings[type] : undefined // eslint-disable-line security/detect-object-injection
  return mapping && typeof mapping.rev === 'function'
    ? mapping.rev(mappingObject)
    : undefined
}

const mapByType = (
  mapObject: MappingObject,
  type: string | string[],
  mappings: Mappings
) =>
  Array.isArray(type)
    ? type.reduce(
        (target, aType) => ({
          ...target,
          ...mapOneType(mapObject, aType, mappings),
        }),
        {} as DataObject
      )
    : mapOneType(mapObject, type, mappings)

export default function mapRequest(
  requestMapper: MapTransform | null,
  mappings: Dictionary<MapTransform>
) {
  return (exchange: Exchange) => {
    const mappingObject = mappingObjectFromExchange(exchange, true)

    if (exchange.request.type) {
      mappingObject.data = mapByType(
        mappingObject,
        exchange.request.type,
        mappings
      )
    }
    if (typeof requestMapper?.rev === 'function') {
      const mapped = requestMapper.rev(mappingObject)
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
