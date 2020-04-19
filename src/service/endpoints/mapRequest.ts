import { MapTransform } from 'map-transform'
import { Exchange, Dictionary, DataObject } from '../../types'
import {
  mappingObjectFromExchange,
  exchangeFromMappingObject,
  MappingObject,
} from '../../utils/exchangeMapping'
import { Mappings } from './create'

const getMapperFn = (
  mapper: MapTransform | null | undefined,
  sendNoDefaults: boolean,
  incoming: boolean
) =>
  incoming
    ? sendNoDefaults
      ? mapper?.onlyMappedValues
      : mapper
    : sendNoDefaults
    ? mapper?.rev.onlyMappedValues
    : mapper?.rev

function mapOneType(
  mappingObject: MappingObject,
  type: string,
  mappings: Mappings,
  sendNoDefaults: boolean,
  incoming: boolean
) {
  const mapping =
    type && mappings.hasOwnProperty(type) ? mappings[type] : undefined // eslint-disable-line security/detect-object-injection
  const mapperFn = getMapperFn(mapping, sendNoDefaults, incoming)
  return typeof mapperFn === 'function' ? mapperFn(mappingObject) : undefined
}

const mapByType = (
  mappingObject: MappingObject,
  type: string | string[],
  mappings: Mappings,
  sendNoDefaults: boolean,
  incoming: boolean
) =>
  Array.isArray(type)
    ? type.reduce(
        (target, aType) => ({
          ...target,
          ...mapOneType(
            mappingObject,
            aType,
            mappings,
            sendNoDefaults,
            incoming
          ),
        }),
        {} as DataObject
      )
    : mapOneType(mappingObject, type, mappings, sendNoDefaults, incoming)

export default function mapRequest(
  requestMapper: MapTransform | null,
  mappings: Dictionary<MapTransform>,
  endpointSendNoDefaults = false
) {
  return (exchange: Exchange) => {
    const sendNoDefaults =
      exchange.request.sendNoDefaults ?? endpointSendNoDefaults
    const incoming = exchange.incoming || false
    const mappingObject = mappingObjectFromExchange(
      exchange,
      true // isRequest
    )

    const mapData = () => {
      const mapperFn = getMapperFn(requestMapper, sendNoDefaults, incoming)
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
    }

    if (incoming) {
      mapData()
    }

    if (exchange.request.type) {
      mappingObject.data = mapByType(
        mappingObject,
        exchange.request.type,
        mappings,
        sendNoDefaults,
        incoming
      )
    }

    if (!incoming) {
      mapData()
    }

    return exchangeFromMappingObject(
      exchange,
      mappingObject,
      true // isRequest
    )
  }
}
