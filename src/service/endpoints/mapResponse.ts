import { MapTransform } from 'map-transform'
import { Exchange, Dictionary } from '../../types'
import { Mappings } from './create'
import { flatten } from 'ramda'
import {
  mappingObjectFromExchange,
  exchangeFromMappingObject,
  MappingObject,
} from '../../utils/exchangeMapping'

const mapOneType = (
  mappingObject: MappingObject,
  type: string,
  mappings: Mappings
) =>
  type && mappings.hasOwnProperty(type) && typeof mappings[type] === 'function' // eslint-disable-line security/detect-object-injection
    ? mappings[type](mappingObject) // eslint-disable-line security/detect-object-injection
    : undefined

const mapByType = (
  mappingObject: MappingObject,
  type: string | string[],
  mappings: Mappings
) =>
  Array.isArray(type)
    ? flatten(
        type.map((type) => mapOneType(mappingObject, type, mappings))
      ).filter(Boolean)
    : mapOneType(mappingObject, type, mappings)

const errorIfErrorMessage = (status: string | null, error?: string) =>
  (!status || status === 'ok') && error ? 'error' : status

export default function mapResponse(
  fromMapper: MapTransform | null,
  mappings: Dictionary<MapTransform>
) {
  return (exchange: Exchange) => {
    // Map nothing if this is a dryrun
    if (exchange.status === 'dryrun') {
      return exchange
    }

    const mappingObject = mappingObjectFromExchange(exchange)

    if (typeof fromMapper === 'function') {
      const mapped = fromMapper(mappingObject)
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
        data: mapByType(mappingObject, exchange.request.type, mappings),
      })
    } else {
      return exchangeFromMappingObject(exchange, mappingObject)
    }
  }
}
