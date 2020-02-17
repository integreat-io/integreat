import { MapTransform } from 'map-transform'
import { Exchange, ExchangeResponse, Dictionary } from '../../types'
import { Mappings } from './create'
import { flatten } from 'ramda'
import { mappingObjectFromExchange } from '../../utils/exchangeMapping'

const mapOneType = (
  response: ExchangeResponse,
  type: string,
  mappings: Mappings
) =>
  type && mappings.hasOwnProperty(type) && typeof mappings[type] === 'function' // eslint-disable-line security/detect-object-injection
    ? mappings[type](response) // eslint-disable-line security/detect-object-injection
    : undefined

const mapByType = (
  response: ExchangeResponse,
  type: string | string[],
  mappings: Mappings
) =>
  Array.isArray(type)
    ? flatten(type.map(type => mapOneType(response, type, mappings))).filter(
        Boolean
      )
    : mapOneType(response, type, mappings)

const isErrorStatus = (status?: string | null) =>
  status !== null && status !== undefined && !['ok', 'queued'].includes(status)

export default function mapFromService(
  fromMapper: MapTransform | null,
  mappings: Dictionary<MapTransform>
) {
  return (exchange: Exchange) => {
    if (exchange.status === 'dryrun') {
      return exchange
    }

    const {
      status: mappedStatus,
      data,
      error: mappedError,
      ...response // TODO: Specify allowed properties?
    } = fromMapper ? fromMapper(exchange) || {} : exchange.response

    const { type } = exchange.request
    const mappedData = type
      ? mapByType(mappingObjectFromExchange(exchange, data), type, mappings)
      : data
    const status = mappedStatus || exchange.status
    const error = mappedError || exchange.response.error

    return {
      ...exchange,
      status,
      response: {
        ...exchange.response,
        ...response,
        data: mappedData,
        ...(isErrorStatus(status) ? { error } : {})
      }
    }
  }
}
