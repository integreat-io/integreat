const Storage = require('./storage')
const rep = require('./utils/repository')

const version = '0.1'

class Integreat {
  constructor (config) {
    this.version = version
    this._adapters = new Map()
    this._parsers = new Map()
    this._formatters = new Map()
    this._transformers = new Map()
    this._mappings = new Map()
    this._storage = new Storage(config)
  }

  // Adapters
  getAdapter (id) { return rep.get(this._adapters, id) }
  setAdapter (id, adapter) { rep.set(this._adapters, id, adapter) }
  removeAdapter (id) { rep.remove(this._adapters, id) }

  // Parsers
  getParser (id) { return rep.get(this._parsers, id) }
  setParser (id, parser) { rep.set(this._parsers, id, parser) }
  removeParser (id) { rep.remove(this._parsers, id) }

  // Formatters
  getFormatter (id) { return rep.get(this._formatters, id) }
  setFormatter (id, formatter) { rep.set(this._formatters, id, formatter) }
  removeFormatter (id) { rep.remove(this._formatters, id) }

  // Transformers
  getTransformer (id) { return rep.get(this._transformers, id) }
  setTransformer (id, transformer) { rep.set(this._transformers, id, transformer) }
  removeTransformer (id) { rep.remove(this._transformers, id) }

  // Mappings
  getMapping (id) { return rep.get(this._mappings, id) }
  setMapping (id, mapping) { rep.set(this._mappings, id, mapping) }
  removeMapping (id) { rep.remove(this._mappings, id) }

  /**
   * Load default adapters, parsers, formatters, and transformers.
   * @returns {void}
   */
  loadDefaults () {
    // Adapters
    this.setAdapter('json', require('./adapters/json'))

    // Parsers
    this.setParser('date', require('./parsers/date'))
    this.setParser('float', require('./parsers/float'))
    this.setParser('integer', require('./parsers/integer'))
  }

  /**
   * Return storage used for this integration layer.
   * @returns {Object} Storage object
   */
  getStorage () {
    return this._storage
  }

  /**
   * Start integration server and returns a promise.
   * The promise is resolved with server instance as soon as it is started.
   * @returns {Promise} Promise of server instance
   */
  start () {
    return Promise.resolve()
  }
}
Integreat.version = version

module.exports = Integreat
