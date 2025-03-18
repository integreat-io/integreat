import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import mapAny from 'map-any'
import definitions from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import entry1 from '../helpers/data/entry1.js'
import entry2 from '../helpers/data/entry2.js'
import { isObject } from '../../utils/is.js'
import type { TypedData } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const transformers = {
  upperCase: () => () => (value: unknown) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  addSectionsToText: () => () =>
    mapAny((item: unknown) => {
      if (!isObject(item)) {
        return item
      }
      const sections = Array.isArray(item.sections)
        ? item.sections.join('|')
        : ''
      item.text = `${item.text} - ${sections}`
      return item
    }),
}

const resourcesWithTrans = {
  ...resources,
  transformers: {
    ...resources.transformers,
    ...transformers,
  },
}

test('mutateAndTransform', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test('should transform entry', async () => {
    nock('http://some.api').get('/entries/ent1').reply(200, { data: entry1 })
    const action = {
      type: 'GET',
      payload: { type: 'entry', id: 'ent1' },
    }
    const mapping = [
      {
        $iterate: true,
        id: 'key',
        title: ['headline', { $transform: 'upperCase' }],
        text: 'body',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        author: 'authorId',
        sections: 'sections[]',
      },
      { $transform: 'addSectionsToText' },
      { $cast: 'entry' },
    ]
    const defs = {
      ...definitions,
      mutations: {
        ...definitions.mutations,
        'entries-entry': mapping,
      },
    }

    const great = Integreat.create(defs, resourcesWithTrans)
    const ret = await great.dispatch(action)

    assert.equal(ret.status, 'ok', ret.error)
    const item = ret.data as TypedData
    assert.equal(item.id, 'ent1')
    assert.equal(item.title, 'ENTRY 1')
    assert.equal(item.text, 'The text of entry 1 - news|sports')
  })

  await t.test('should transform array of entries', async () => {
    nock('http://some.api')
      .get('/entries')
      .reply(200, { data: [entry1, entry2] })
    const action = {
      type: 'GET',
      payload: { type: 'entry' },
    }
    const mapping = [
      {
        $iterate: true,
        id: 'key',
        title: ['headline', { $transform: 'upperCase' }],
        text: 'body',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        author: 'authorId',
        sections: 'sections[]',
      },
      { $transform: 'addSectionsToText' },
      { $cast: 'entry' },
    ]
    const defs = {
      ...definitions,
      mutations: {
        ...definitions.mutations,
        'entries-entry': mapping,
      },
    }

    const great = Integreat.create(defs, resourcesWithTrans)
    const ret = await great.dispatch(action)

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(Array.isArray(ret.data), true)
    const data = ret.data as TypedData[]
    assert.equal(data.length, 2)
    assert.equal(data[0].id, 'ent1')
    assert.equal(data[0].title, 'ENTRY 1')
    assert.equal(data[0].text, 'The text of entry 1 - news|sports')
    assert.equal(data[1].id, 'ent2')
    assert.equal(data[1].title, 'ENTRY 2')
    assert.equal(data[1].text, 'The text of entry 2 - ')
  })
})
