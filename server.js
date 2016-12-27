const Integreat = require('./index')

const great = new Integreat()

great.loadDefaults()
// great.loadSourceDefsFromDb()

great.start()
.then(() => {
  console.log('Integreat is running')
})
