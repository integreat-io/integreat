import transformers from './transformers'
import authenticators from './authenticators'

export default (): Record<string, unknown> => ({
  adapters: {},
  authenticators: authenticators(),
  transformers,
})
