const resources = () => ({
  adapters: require('./adapters')(),
  authenticators: require('./authenticators')(),
  transformers: require('./transformers')(),
  mutators: require('./mutators')()
})

module.exports = resources
