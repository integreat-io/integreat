module.exports = () => ({
  adapters: require('./adapters')(),
  authenticators: require('./authenticators')(),
  transformers: require('./transformers')(),
  mutators: require('./mutators')()
})
