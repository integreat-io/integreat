import type Service from './service/index.js'
import type { Response } from './types.js'

type ErrorTuple = [Response, string]

function errorMessageFromResponses(errors: ErrorTuple[]) {
  const messages = errors.map(
    ([response, serviceId]) =>
      `'${serviceId}' (${response.status}: ${response.error})`
  )
  return `The following services could not close: ${messages.join(', ')}`
}

export default async function close(services: Service[]): Promise<Response> {
  const responses = await Promise.all(
    services.map((service) => service.close())
  )
  const errors = responses
    .map<ErrorTuple>((response, index) => [response, services[index].id]) // eslint-disable-line security/detect-object-injection
    .filter(([response]) => response.status !== 'ok')
  return errors.length === 0
    ? { status: 'ok' }
    : { status: 'error', error: errorMessageFromResponses(errors) }
}
