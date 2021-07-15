import { Dispatch, Response } from './types'
import { Service } from './service/types'

export default async function start(
  services: Service[],
  dispatch: Dispatch
): Promise<Response> {
  for (const service of services) {
    const response = await service.listen(dispatch)
    if (response.status !== 'ok' && response.status !== 'noaction') {
      return {
        status: 'error',
        error: `Could not listen to service '${service.id}'. [${response.status}] ${response.error}`,
      }
    }
  }

  return { status: 'ok' }
}
