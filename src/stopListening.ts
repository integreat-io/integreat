import { isOkResponse } from './utils/is.js'
import type { Response } from './types.js'
import type Service from './service/Service.js'

const combineErrors = (responses: Response[]) =>
  responses.map(({ status, error }) => `[${status}] ${error}`).join(' | ')

export default async function stopListening(services: Service[]) {
  const errors: Response[] = []
  for (const service of services) {
    const response = await service.stopListening()
    if (!isOkResponse(response)) {
      errors.push(response)
    }
  }

  return errors.length === 0
    ? { status: 'ok' }
    : {
        status: 'error',
        error: `${errors.length} of ${services.length} services failed to stop listening: ${combineErrors(errors)}`,
      }
}
