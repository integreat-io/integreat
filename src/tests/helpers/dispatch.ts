import pProgress, { PProgress } from 'p-progress'
import { Action, Response } from '../../types.js'

export default (action: Action | null): PProgress<Response> =>
  pProgress(() => ({ status: 'ok', access: { ident: action?.meta?.ident } }))
