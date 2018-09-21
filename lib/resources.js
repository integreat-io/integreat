module.exports = () => ({
  adapters: require('./adapters')(),
  authstrats: require('./authstrats')(),
  transformers: require('./transformers')(),
  mutators: require('./mutators')()
})
