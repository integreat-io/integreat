import debugLib from 'debug'
import { Dispatch, Response } from './types.js'
import { Service } from './service/types.js'

const debug = debugLib('great')

export default async function listen(
  services: Service[],
  dispatch: Dispatch
): Promise<Response> {
  for (const service of services) {
    debug(`Listen to service '${service.id}' ...`)
    const response = await service.listen(dispatch)
    if (response.status !== 'ok' && response.status !== 'noaction') {
      debug(
        `Could not listen to service '${service.id}'. [${response.status}] ${response.error}`
      )
      return {
        status: 'error',
        error: `Could not listen to service '${service.id}'. [${response.status}] ${response.error}`,
      }
    }
    debug('... ok')
  }

  return { status: 'ok' }
}
