import PProgress = require('p-progress')
import { GetService, HandlerDispatch, SetProgress } from '../../types'

const dispatch: HandlerDispatch = (action) =>
  new PProgress((resolve) => {
    resolve({
      ...action,
      response: { ...action.response, status: 'ok' },
    })
  })

const getService: GetService = (_type, _service) => undefined

const setProgress: SetProgress = (_progress: number): void => undefined

export default {
  getService,
  dispatch,
  setProgress,
  options: {},
}
