const resources = () => ({
  adapters: require('./adapters')(),
  authenticators: require('./authenticators')(),
  transformers: require('./transformers')()
})

module.exports = resources
