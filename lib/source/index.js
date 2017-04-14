const parseUriTemplate = require('../utils/parseUriTemplate')

const flatten = (arrs) => arrs.reduce((result, arr) => result.concat(arr), [])

/** Class representing a source */
class Source {
  /**
   * Create a source.
   * @param {string} id - The id of the source
   * @param {Object} adapter - An adapter for this source
   */
  constructor (id, adapter = null) {
    this._id = id
    this._adapter = adapter
    this._items = {}

    this._endpoints = {
      all: null,
      one: null,
      some: null,
      send: null
    }

    this.fetch = {
      endpoint: null,
      changelog: null,
      auth: null
    }

    this.send = {
      endpoint: null,
      auth: null,
      map: []
    }

    this.schedule = null
    this.allowRelay = false
    this.allowPush = false
    this.nextSync = null
  }

  /** Return id */
  get id () {
    return this._id
  }

  /** Return adapter */
  get adapter () {
    return this._adapter
  }

  /** Return items */
  get items () {
    return this._items
  }

  /** Return endpoints */
  get endpoints () {
    return this._endpoints
  }

  /**
   * Get the endpoint for fetching all items.
   * Any given params will be used as to expand the endpoint uri as
   * a uri template.
   * @params {Object} params - Object with key and value for the expansion
   * @returns {string} Endpoint uri
   */
  getEndpointAll (params) {
    return parseUriTemplate(this.endpoints.all, params)
  }

  /**
   * Get the endpoint for fetching one item.
   * Any given params will be used as to expand the endpoint uri as
   * a uri template.
   * @params {Object} params - Object with key and value for the expansion
   * @returns {string} Endpoint uri
   */
  getEndpointOne (params) {
    return parseUriTemplate(this.endpoints.one, params)
  }

  /**
   * Get the endpoint for fetching some items.
   * Any given params will be used as to expand the endpoint uri as
   * a uri template.
   * @params {Object} params - Object with key and value for the expansion
   * @returns {string} Endpoint uri
   */
  getEndpointSome (params) {
    return parseUriTemplate(this.endpoints.some, params)
  }

  /**
   * Get the endpoint for sending an item.
   * Any given params will be used as to expand the endpoint uri as
   * a uri template.
   * @params {Object} params - Object with key and value for the expansion
   * @returns {string} Endpoint uri
   */
  getEndpointSend (params) {
    return parseUriTemplate(this.endpoints.send, params)
  }

  /**
   * Sets the given next sync. If none is given as an attribute,
   * calculate next from schedule.
   * @param {integer} nextSync - Next sync time stamp
   * @returns {integer} Next sync time stamp
   */
  setNextSync (nextSync) {
    if (nextSync) {
      // Set given nextSync
      this.nextSync = nextSync
    } else if (!this.schedule) {
      // Set to null when no schedule
      this.nextSync = null
    } else {
      // Set nextSync from schedule, or now if nextSync is in the past
      const fromSchedule = (this.nextSync) ? this.nextSync + (this.schedule * 1000) : 0
      this.nextSync = Math.max(fromSchedule, Date.now())
    }

    // Return next sync time
    return this.nextSync
  }

  /**
   * Will normalize, map, and filter data from a source.
   * If a type  is given, the itemDef with this type will be used. Otherwise,
   * all itemDefs of this Source will be used.
   * @param {Object} data - The data object to normalize
   * @param {string} type - The type of the itemDef to use, or null to use all
   * @returns {Promise} Promise of normalized data
   */
  async mapFromSource (data, type = null) {
    if (!this.adapter || !data) {
      return []
    }

    const processOne = async (def) => {
      const items = await this.adapter.normalize(data, def.path)
      return [].concat(items || [])
        .map((item) => def.mapItem(item))
        .filter((item) => def.filterItem(item))
    }

    if (type && this.items[type]) {
      return processOne(this.items[type])
    } else {
      const itemDefs = Object.values(this.items)
      const itemArrays = await Promise.all(itemDefs.map(processOne))
      return flatten(itemArrays)
    }
  }

  /**
   * Will serialize, map, and filter data to a source.
   * An itemDef matching the data's type will be used.
   * @param {Object} data - The data object to serialize
   * @returns {Promise} Promise of serialized data
   */
  async mapToSource (data) {
    if (!data || !this.adapter) {
      return null
    }

    const itemDef = this.items[data.type]
    if (itemDef) {
      // const item = itemDef.mapItem(data)
      return await this.adapter.serialize(data, itemDef.path)
    }

    return null
  }

  /**
   * Fetch and return items from source.
   * Will retrieve from source, do the necessary mapping and filtering,
   * and return the results as an array of items.
   * @param {string} endpoint - The endpoint url to fetch from
   * @returns {Promise} Promise for array of items
   */
  async fetchItems (endpoint) {
    if (!this.adapter || !endpoint) {
      return []
    }
    const data = await this.adapter.retrieve(endpoint, this.fetch.auth)
    return this.mapFromSource(data)
  }

  /**
   * Send and item to the source.
   * Will do the necessary mapping and filtering, and send the data to the
   * source.
   * @param {Object} data - The data to send
   * @param {string} endpoint - The enpoint url to fetch from
   * @returns {Promise} Promise that will be resolved when item is sent
   */
  async sendItems (data, endpoint) {
    if (!this.adapter || !data || !endpoint) {
      return null
    }
    const item = await this.mapToSource(data)
    this.adapter.send(endpoint, item)
  }
}

module.exports = Source
