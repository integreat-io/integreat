class Source {
  constructor (itemtype, adapter) {
    this.itemtype = itemtype
    this.adapter = null

    this.fetch = {
      endpoint: null,
      changelog: null,
      path: null,
      map: [],
      filter: []
    }

    this.send = {
      endpoint: null,
      map: []
    }

    this.attributes = []
    this.relationships = []
    this.item = {
      map: [],
      filter: []
    }

    this.schedule = null
    this.allowRelay = false
    this.allowPush = false
    this.nextPush = null
  }
}

module.exports = Source
