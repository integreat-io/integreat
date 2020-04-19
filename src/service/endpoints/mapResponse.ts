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
  mapping: MapTransform | null | undefined,
  sendNoDefaults: boolean
) => (sendNoDefaults ? mapping?.onlyMappedValues : mapping)

function mapOneType(
  mappingObject: MappingObject,
  type: string,
  mappings: Mappings,
  returnNoDefaults: boolean
) {
  const mapping =
    type && mappings.hasOwnProperty(type) ? mappings[type] : undefined // eslint-disable-line security/detect-object-injection
  const mapperFn = getMapperFn(mapping, returnNoDefaults)
  return typeof mapperFn === 'function' ? mapperFn(mappingObject) : undefined
}

const mapByType = (
  mappingObject: MappingObject,
  type: string | string[],
  mappings: Mappings,
  returnNoDefaults: boolean
) =>
  Array.isArray(type)
    ? flatten(
        type.map((type) =>
          mapOneType(mappingObject, type, mappings, returnNoDefaults)
        )
      ).filter(Boolean)
    : mapOneType(mappingObject, type, mappings, returnNoDefaults)

const errorIfErrorMessage = (status: string | null, error?: string) =>
  (!status || status === 'ok') && error ? 'error' : status

export default function mapResponse(
  fromMapper: MapTransform | null,
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
    const mappingObject = mappingObjectFromExchange(exchange)

    const mapperFn = getMapperFn(fromMapper, returnNoDefaults)
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

    if (exchange.request.type) {
      return exchangeFromMappingObject(exchange, {
        ...mappingObject,
        data: mapByType(
          mappingObject,
          exchange.request.type,
          mappings,
          returnNoDefaults
        ),
      })
    } else {
      return exchangeFromMappingObject(exchange, mappingObject)
    }
  }
}
