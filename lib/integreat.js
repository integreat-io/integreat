const http = require('http')
const Storage = require('./storage')
const Scheduler = require('./utils/scheduler')
const rep = require('./utils/repository')
const scheduleSource = require('./sync/scheduleSource')
const processSource = require('./sync/processSource')
const version = '0.1'

class Integreat {
  constructor (config) {
    this._config = config || {}
    const dbConfig = (config && config.db) ? config.db : undefined
    this.version = version
    this._adapters = new Map()
    this._parsers = new Map()
    this._formatters = new Map()
    this._transformers = new Map()
    this._sources = new Map()
    this._storage = new Storage(dbConfig)
    this._scheduler = new Scheduler()
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

  /**
   * Get source definition.
   * @param {string} id - Identifier for source definition
   * @returns {object} Source definition object
   */
  getSource (id) {
    return rep.get(this._sources, id)
  }

  /**
   * Set source definition.
   * @param {string} id - Identifier for source definition
   * @param {Object} sourceDef - The source definition
   * @returns {void}
   */
  setSource (id, source) {
    rep.set(this._sources, id, source)
  }

  /**
   * Remove source definition.
   * @param {string} id - Identifier for source definition
   * @returns {void}
   */
  removeSource (id) {
    rep.remove(this._sources, id)
  }

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
   * Will start schedule queue and schedule all sources for sync.
   * If a `port` is set in the config, a node.js server will be started at that
   * port, and the returned promise will resolve with that instance when it is
   * started.
   * With no port, no node.js server will be started, and the returned promise
   * is resolved right away.
   * @returns {Promise} Promise of server instance
   */
  start () {
    return new Promise((resolve, reject) => {
      // Schedule all sources for sync. Sources without a schedule will be
      // skipped
      this._sources.forEach((source) => {
        scheduleSource(this._scheduler, source)
      })

      // Subscribe to schedule queue
      this._scheduleSubscription = this._scheduler.subscribe(
        processSource(this.getAdapter.bind(this), this._storage)
      )

      if (this._config.port) {
        // Start a node.js server on the given port
        const server = http.createServer()
        server.listen(this._config.port, () => {
          resolve(server)
        })
      } else {
        // Don't start a node.js when no port is set
        resolve(null)
      }
    })
  }

  /**
   * Stop integration server.
   * @returns {void}
   */
  stop () {
    if (this._scheduleSubscription) {
      this._scheduleSubscription.dispose()
      this._scheduleSubscription = null
    }
  }
}
Integreat.version = version

module.exports = Integreat
