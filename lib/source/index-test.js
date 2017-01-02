import test from 'ava'

import Source from './index'

test('should exist', (t) => {
  t.is(typeof Source, 'function')
})

test('should have itemtype', (t) => {
  const itemtype = 'entry'

  const source = new Source(itemtype)

  t.is(source.itemtype, 'entry')
})

test('should have no adapter by default', (t) => {
  const source = new Source()

  t.is(source.adapter, null)
})

test('should have default fetch', (t) => {
  const defaultFetch = {
    endpoint: null,
    changelog: null,
    path: null,
    map: [],
    filter: []
  }

  const source = new Source()

  t.deepEqual(source.fetch, defaultFetch)
})

test('should have default send', (t) => {
  const defaultSend = {
    endpoint: null,
    map: []
  }

  const source = new Source()

  t.deepEqual(source.send, defaultSend)
})

test('should have no attributes by default', (t) => {
  const source = new Source()

  t.deepEqual(source.attributes, [])
})

test('should have no relationships by default', (t) => {
  const source = new Source()

  t.deepEqual(source.relationships, [])
})

test('should have no default item', (t) => {
  const defaultItem = {
    map: [],
    filter: []
  }

  const source = new Source()

  t.deepEqual(source.item, defaultItem)
})

test('should have default sync settings', (t) => {
  const source = new Source()

  t.is(source.schedule, null)
  t.false(source.allowRelay)
  t.false(source.allowPush)
  t.is(source.nextPush, null)
})
