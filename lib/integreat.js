const http = require('http')
const EventEmitter = require('events')
const Dbdb = require('dbdb').couchdb
const Connector = require('./connector')
const Sources = require('./sources')
const Scheduler = require('./utils/scheduler')
const loadDefaults = require('./utils/loadDefaults')
const scheduleSource = require('./sync/scheduleSource')
const processSource = require('./sync/processSource')
const createSource = require('./source/create')
const fetchSourceDefs = require('./utils/fetchSourceDefs')
const actionHandler = require('./actions/actionHandler')
const debug = require('debug')('great')

const version = '0.1'

function setupAuth (authDef) {
  const {strategy, options, id} = authDef
  const Strat = this.authStrats.get(strategy)
  if (Strat) {
    this._liveAuths.set(id, new Strat(options))
  }
}

function scheduleSourceDef (sourceDef) {
  debug('Scheduling source `%s`', sourceDef.adapter)
  const source = createSource(
    sourceDef,
    (id) => this.adapters.get(id),
    (id) => this.mappers.get(id),
    (id) => this.filters.get(id),
    this.getLiveAuth.bind(this)
  )
  scheduleSource(this._scheduler, source)
}

class Integreat {
  constructor (config = {}) {
    this._config = config
    this.version = version

    this._sources = new Sources()
    this._adapters = new Map()
    this._mappers = new Map()
    this._filters = new Map()
    this._authConfigs = new Map()
    this._authStrats = new Map()

    this._liveAuths = new Map()

    this._db = new Dbdb(config.db)
    this._scheduler = new Scheduler()
    this._emitter = new EventEmitter()
  }

  /** Sources */
  get sources () {
    return this._sources
  }

  /** Adapters */
  get adapters () {
    return this._adapters
  }

  /** Mappers */
  get mappers () {
    return this._mappers
  }

  /** Filters */
  get filters () {
    return this._filters
  }

  /** Auth configs */
  get authConfigs () {
    return this._authConfigs
  }

  /** Auth strategies */
  get authStrats () {
    return this._authStrats
  }

  /**
   * Add listener to an event from this Integreat instance.
   * @param {string} eventName - Name of event to listen for
   * @param {function} listener - Function to call when event is emitted
   * @returns {Object} This Integreat instance - for chaining
   */
  on (eventName, listener) {
    this._emitter.on(eventName, listener)
    return this
  }

  /**
   * Get live auth objects.
   * @param {string} id - Identifier for auth
   * @returns {object} Live auth object
   */
  getLiveAuth (id) {
    return this._liveAuths.get(id)
  }

  /**
   * Load source definitions from storage database.
   * @returns {array} Array of the loaded source defs
   */
  loadSourceDefsFromDb () {
    debug('Loading source definitions from database')
    return fetchSourceDefs(this._db)

    .then((sourceDefs) => {
      debug('Loaded %d source definitions', sourceDefs.length)
      sourceDefs.forEach((sourceDef) => {
        this.sources.set(sourceDef.id, sourceDef)
        debug('Set source def `%s`', sourceDef.id)
      })
      return sourceDefs
    })
  }

  /**
   * Load default adapters, mappers, and filters.
   * @returns {void}
   */
  loadDefaults () {
    debug('Loading defaults')
    loadDefaults(this)
  }

  /**
   * Dispatches an action to the router.
   * @param {Object} action - The action object, with type and payload
   * @returns {Promise} Promise of retrieved data
   */
  async dispatch (action) {
    return await actionHandler(action, this.sources)
  }

  /**
   * Return connection for an item type, for getting access to the data stored
   * in the integration layer or as a relay to the source.
   * @param {string} type - The type to connect to
   * @returns {Object} Connector object
   */
  connect (type) {
    return new Connector(this._db, type)
  }

  // Private function syncing one source. Exposed for testing purposes.
  _syncSource (source) {
    debug('Processing source `%s`', source.id)
    return processSource(source, this.connect(source.type))
    .then((items) => {
      scheduleSource(this._scheduler, source)
      this._emitter.emit('sync', source, items)
    })
    .catch((err) => {
      debug('Error while processing source `%s`: %s', source.id, err)
    })
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
      debug('Starting Integreat')

      debug('Setting up auth strategies')
      this._authConfigs.forEach(setupAuth.bind(this))

      debug('Subscribing to scheduler queue')
      this._scheduleSubscription =
        this._scheduler.subscribe(this._syncSource.bind(this))

      debug('Scheduling sources')
      this.sources.forEach(scheduleSourceDef.bind(this))

      if (this._config.port) {
        // Start a node.js server on the given port
        const server = http.createServer()
        server.listen(this._config.port, () => {
          debug('Integreat is running with http server on port %d', this._config.port)
          this._emitter.emit('start', server)
          resolve(server)
        })
      } else {
        // Don't start a node.js when no port is set
        debug('Integreat is running without http server')
        this._emitter.emit('start', null)
        resolve(null)
      }
    })
  }

  /**
   * Stop integration server.
   * @returns {void}
   */
  stop () {
    debug('Stopping Integreat')
    if (this._scheduleSubscription) {
      this._scheduleSubscription.dispose()
      this._scheduleSubscription = null
      debug('Unsubscribed from scheduler queue')
    }
    this._emitter.emit('stop')
  }
}
Integreat.version = version

module.exports = Integreat
