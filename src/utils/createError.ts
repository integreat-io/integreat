import { Exchange } from '../types'

export default function createError(
  exchange: Exchange,
  error?: string,
  status = 'error'
): Exchange {
  return {
    ...exchange,
    status,
    response: {
      ...exchange.response,
      error,
    },
  }
}
