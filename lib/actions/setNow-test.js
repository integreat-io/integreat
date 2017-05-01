import test from 'ava'
import nock from 'nock'
import Source from '../source'
import Item from '../source/item'
import Attribute from '../source/attribute'
import couchdb from '../adapters/couchdb'

import setNow from './setNow'

test.after((t) => {
  nock.restore()
})

test('should exist', (t) => {
  t.is(typeof setNow, 'function')
})

test('should set item to source', async (t) => {
  const scope = nock('http://api1.test')
    .put('/database/entry:ent1', {_id: 'ent1', type: 'entry'})
    .reply(200, {okay: true, id: 'ent1', rev: '000001'})
  const action = {
    type: 'SET_NOW',
    payload: {id: 'ent1', type: 'entry'}
  }
  const source = new Source('entries', couchdb)
  const itemDef = new Item('entry')
  itemDef.attributes.push(new Attribute('id'))
  itemDef.attributes.push(new Attribute('type'))
  source.items.entry = itemDef
  source.endpoints.send = 'http://api1.test/database/{type}:{id}'

  const ret = await setNow(action, source)

  t.true(scope.isDone())
  t.truthy(ret)
  t.is(ret.status, 200)
})
