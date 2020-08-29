import authenticators from './authenticators'
import transformers from './transformers'

export default (): Record<string, unknown> => ({
  adapters: {},
  authenticators,
  transformers,
})
