import { MapTransform } from 'map-transform'
import {
  Exchange,
  ExchangeRequest,
  Dictionary,
  Data,
  TypedData
} from '../../types'
import { Mappings } from './create'

const mapOneType = (items: TypedData[], type: string, mappings: Mappings) => {
  const mapping =
    type && mappings.hasOwnProperty(type) ? mappings[type] : undefined // eslint-disable-line security/detect-object-injection
  return mapping && typeof mapping.rev === 'function'
    ? mapping.rev(items)
    : undefined
}

const mapByType = (
  request: ExchangeRequest,
  type: string | string[],
  mappings: Mappings
) =>
  Array.isArray(type)
    ? type.reduce(
        (target, type) => ({
          ...target,
          ...mapOneType(request, type, mappings)
        }),
        {} as Data
      )
    : mapOneType(request, type, mappings)

export default function mapToService(
  toMapper: MapTransform | null,
  mappings: Dictionary<MapTransform>
) {
  return (exchange: Exchange) => {
    const { type } = exchange.request
    const data = type
      ? mapByType(exchange.request, type, mappings)
      : exchange.request.data
    const request = toMapper
      ? toMapper.rev({
          ...exchange,
          request: { ...exchange.request, data }
        })
      : { ...exchange.request, data }
    return { ...exchange, request: { ...exchange.request, ...request } }
  }
}
