import transformers from './transformers'

const resources = () => ({
  adapters: {},
  authenticators: require('./authenticators').default(),
  transformers,
})

export default resources
