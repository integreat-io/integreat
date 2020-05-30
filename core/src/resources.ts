const resources = () => ({
  adapters: {},
  authenticators: require('./authenticators').default(),
  transformers: require('./transformers').default()
})

export default resources
