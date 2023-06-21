import pProgress from 'p-progress'
import { GetService, HandlerDispatch, SetProgress } from '../../types.js'

const dispatch: HandlerDispatch = (action) =>
  pProgress(() => ({ ...action.response, status: 'ok' }))

const getService: GetService = (_type, _service) => undefined

const setProgress: SetProgress = (_progress: number): void => undefined

export default {
  getService,
  dispatch,
  setProgress,
  options: {},
}
