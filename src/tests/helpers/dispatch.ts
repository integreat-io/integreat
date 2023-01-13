import pProgress, { PProgress } from 'p-progress'
import { Action, Response } from '../../types.js'

export default (_action: Action | null): PProgress<Response> =>
  pProgress(() => ({ status: 'ok' }))
