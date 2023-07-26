import {
  prepareTemplate,
  replaceTemplate,
} from '../transformers/generateUri.js'
import type { Adapter } from '../types.js'

const adapter: Adapter = {
  prepareOptions(_options, _serviceId) {
    return {}
  },

  async normalize(action, _options) {
    return action
  },

  async serialize(action, _options) {
    const template = action.meta?.options?.uri
    if (typeof template === 'string') {
      const parts = prepareTemplate(template)
      const uri = await replaceTemplate(parts, action)
      return {
        ...action,
        meta: { ...action.meta, options: { ...action.meta?.options, uri } },
      }
    }

    return action
  },
}

export default adapter
