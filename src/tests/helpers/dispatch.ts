import PProgress = require('p-progress')
import { Action, Response } from '../../types'

export default (_action: Action | null): PProgress<Response> =>
  new PProgress((resolve) => {
    resolve({ status: 'ok' })
  })
