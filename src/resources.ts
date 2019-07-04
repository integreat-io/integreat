const resources = () => ({
  adapters: {},
  authenticators: require('./authenticators')(),
  transformers: require('./transformers')()
})

module.exports = resources
