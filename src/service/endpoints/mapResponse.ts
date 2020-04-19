import { MapTransform } from 'map-transform'
import { Exchange, Dictionary } from '../../types'
import { Mappings } from './create'
import { flatten } from 'ramda'
import {
  mappingObjectFromExchange,
  exchangeFromMappingObject,
  MappingObject,
} from '../../utils/exchangeMapping'

const getMapperFn = (
  mapper: MapTransform | null | undefined,
  sendNoDefaults: boolean,
  incoming: boolean
) =>
  incoming
    ? sendNoDefaults
      ? mapper?.rev.onlyMappedValues
      : mapper?.rev
    : sendNoDefaults
    ? mapper?.onlyMappedValues
    : mapper

function mapOneType(
  mappingObject: MappingObject,
  type: string,
  mappings: Mappings,
  returnNoDefaults: boolean,
  incoming: boolean
) {
  const mapping =
    type && mappings.hasOwnProperty(type) ? mappings[type] : undefined // eslint-disable-line security/detect-object-injection
  const mapperFn = getMapperFn(mapping, returnNoDefaults, incoming)
  return typeof mapperFn === 'function' ? mapperFn(mappingObject) : undefined
}

const mapByType = (
  mappingObject: MappingObject,
  type: string | string[],
  mappings: Mappings,
  returnNoDefaults: boolean,
  incoming: boolean
) =>
  Array.isArray(type)
    ? flatten(
        type.map((type) =>
          mapOneType(mappingObject, type, mappings, returnNoDefaults, incoming)
        )
      ).filter(Boolean)
    : mapOneType(mappingObject, type, mappings, returnNoDefaults, incoming)

const errorIfErrorMessage = (status: string | null, error?: string) =>
  (!status || status === 'ok') && error ? 'error' : status

export default function mapResponse(
  responseMapper: MapTransform | null,
  mappings: Dictionary<MapTransform>,
  endpointReturnNoDefaults = false
) {
  return (exchange: Exchange) => {
    // Map nothing if this is a dryrun
    if (exchange.status === 'dryrun') {
      return exchange
    }

    const returnNoDefaults =
      exchange.response.returnNoDefaults ?? endpointReturnNoDefaults
    const incoming = exchange.incoming || false
    const mappingObject = mappingObjectFromExchange(exchange)

    const mapData = () => {
      const mapperFn = getMapperFn(responseMapper, returnNoDefaults, incoming)
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

      mappingObject.status = errorIfErrorMessage(
        mappingObject.status || exchange.status,
        mappingObject.error
      )
    }

    if (!incoming) {
      mapData()
    }

    if (exchange.request.type) {
      mappingObject.data = mapByType(
        mappingObject,
        exchange.request.type,
        mappings,
        returnNoDefaults,
        incoming
      )
    }

    if (incoming) {
      mapData()
    }

    return exchangeFromMappingObject(exchange, mappingObject)
  }
}
