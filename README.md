# Integreat
An integration layer for node.js.

[![Build Status](https://travis-ci.org/kjellmorten/integreat.svg?branch=master)](https://travis-ci.org/kjellmorten/integreat)
[![Coverage Status](https://coveralls.io/repos/github/kjellmorten/integreat/badge.svg?branch=master)](https://coveralls.io/github/kjellmorten/integreat?branch=master)
[![Dependency Status](https://dependencyci.com/github/kjellmorten/integreat/badge)](https://dependencyci.com/github/kjellmorten/integreat)

**Note:** This project is still in a very early stage. Use at own risk. Anything
might change. At this time, we welcome input on the overall thoughts and
interface, but we're not ready for pull requests yet.

The basic idea of Integreat is to make it easy to define a set of data sources
and expose them through one interface to abstract away the specifics of each
source, and map their data to defined datatypes.

This is done through adapters, that does all the hard work of communicating with
the different sources, a definition format, for setting up each source with the
right adapter and parameters, and a `dispatch()` function to send actions to the
sources.

Integreat has an internal router that will ensure that the action is directed to
the right source through action handlers, and will also queue actions when
appropriate.

It is possible to set up Integreat to treat one source as a relay for other
sources, and schedule syncs between selected sources.

Finally, there will be different interface modules available, that will plug
into the `dispatch()` function and offer other ways of reaching data from the
sources – such as out of the box REST or GraphQL apis.

```
            ___________________________
           |         Integreat         |
           |                           |
           |                  |-> Adapter <-> Source
Action -> Dispatch -> Router -|        |
           |                  |-> Adapter <-> Source
           |                           |
           |___________________________|
```

Data from the sources is retrieved, normalized, and mapped by the adapter, and
returned asynchronously back to the code that initiated the action. Actions for
fetching data will be executed right away.

Actions that updates data on sources will reversely map and serialize the data
before it is sent to a source. These actions may be queued or scheduled.

Integreat comes with a [standard data format](#the-data-format), which is the
only format that will be exposed to the code dispatching the actions. The
mapping, normalizing, and serializing will happing to and from this format,
according to the defined datatypes and mapping rules.


## Install
Requires node v7.

Install from npm:

```
npm install integreat
```

## Hello world
The hello world example of Integreat, would look something like this:

```javascript
const integreat = require('integreat')
const adapters = integreat.adapters('json')

const datatypes = [{
  id: 'message',
  source: 'helloworld',
  attributes: {text: 'string'}
}]

const sources = [{
  id: 'helloworld',
  adapter: 'json',
  endpoints: {
    get: 'https://api.helloworld.io/json'
  },
  mappings: {
    message: {
      attributes: {text: {path: 'message'}}
    }
  }
}]

const great = integreat({datatypes, sources}, {adapters})
const action = {type: 'GET_ONE', payload: {type: 'message'}}

great.dispatch(action).then((data) => console.log(data.attributes.text))
//--> Hello world
```

As most hello world examples, this is a bit too trivial a use case to
demonstrate the real usefulness of Integreat, but shows the simplest setup
possible.

The example requires an imagined api at 'https://api.helloworld.io/json',
returning the following json data:
```json
{
  "message": "Hello world"
}
```

## Datatype definitions
To do anything with Integreat, you need define one or more datatypes. They
describe the data you expected to get out of Integreat. A type will be
associated with a source, which is used to retrieve data for the type.

```
{
  id: <string>,
  source: <sourceId>,
  attributes: {
    <attrId>: {
      type: <string>,
      default: <object>
    }
  },
  relationships: {
    <relId>: {
      type: <string>,
      default: <object>
    }
  }
}
```

## Source definitions
Source definitions are at the core of Integreat, as they define the sources to
fetch data from, how to map this data to a set of items to make available
through Integreat's data api, and how to send data back to the source.

A source definition object defines the adapter, any authentication method, the
endpoints for fetching from and sending to the source, and mappings to the
supported datatypes (attributes and relationships):

```
{
  id: <string>,
  adapter: <string>,
  auth: <auth id>,
  handleMeta: <boolean|sourceId>,
  baseUri: <uri>,
  endpoints: {
    get: <endpoint|string>,
    getOne: <endpoint|string>,
    set: <endpoint|string>,
    setOne: <endpoint|string>,
    getMeta: <endpoint|string>,
    setMeta: <endpoint|string>
  },
  mappings: {
    <datatype>: <mapping definition>,
    ...
  }
}
```

### Endpoint definition
```
{
  uri: <string>,
  path: <string>
}
```

If only the `uri` property is needed, it may simply be given as a string instead
of a endpoint object.

### Mapping definition
```
{
  path: <string>,
  attributes: {
    <attrKey>: {
      path: <string>,
      format: <format pipeline>
    }
  },
  relationships: {
    <relKey>: {
      path: <string>,
      format: <format pipeline>
    }
  },
  transform: <transform pipeline>,
  filterFrom: <filter pipeline>,
  filterTo: <filter pipeline>
}
```

`id`, `createdAt`, or `updatedAt` should be defined as attributes on
the `attributes` property, but will be moved to the item on mapping. If any of
these are not defined, default values will be used; a UUID for `id` and the
current timestamp for `createdAt` and `updatedAt`.

The `type` of an attribute is added to the end of attribute's transform
pipeline. All standard attribute types have corresponding transformers that
ensure the target value will be in the right format.

There is a special "catch all" datatype `*` – the asterisk – that will match
any datatype not represented as regular mappings. If `path`, `transform`,
`filterFrom`, or `filterTo` are set on an asterisk item, they will be applied as
normal, but any `attributes` or `relationships` will be disregarded. Instead all
`attributes` or `relationships` will be mapped as is, unless the `transform`
pipeline modifies them.

### Paths
Endpoints, mappings, attributes, and relationships all have an optional `path`
property, for specifying what part of the data from the source to return in each
case.

The `path` properties use a dot notation with array brackets.

For example, with this data returned from the source ...
```javascript
const data = {
  sections: [
    {
      title: 'First section',
      articles: {
        items: [
          {id: 'article1', title: 'The title', body: {content: 'The text'}}
        ],
        ...
      }
    }
  ]
}
```

... a valid path to retrieve all `items` of the first instance of `sections`
would be `'sections[0].articles.items[]'` and to get the content of each item
`'body.content'`.

The bracket notation offers some possibilities for filtering arrays:
- `[]` - Matches _all_ items in an array
- `[0]` - Matches the item at index 0
- `[1:3]` - Matches all items from index 1 to 3, not including 3.
- `[-1]` - Matches the last item in the array.
- `[id="ent1"]` - Matches the item with an id equal to `'ent1'`

When mapping data _to_ the source, the paths are used to reconstruct the data
format the source expects. Only properties included in the paths will be
created, so any additional properties must be set by a transform function or the
adapter.

Arrays are reconstructing with any object or value at the first index, unless a
single, non-negative index is specified in the path.

### Configuring metadata
If a source may receive metadata, set the `handleMeta` property to `true` and
include the `getMeta` and `setMeta` endpoints.

You may define a `meta` [mapping](#mapping-definition) to define how to map
metadata from and to the source, or you may let the asterisk type handle it.
If you define neither, it will be assumed that the source will provide and
accept metadata in the same format as Integreat:

```
{
  id: <sourceId>,
  type: 'meta',
  createdAt: <date>,
  updatedAt: <date>,
  attributes: {
    <key>: <value>
  }
}
```

A source may also delegate metadata to another source. This is useful, as it
allows for storing metadata for sources that have no support for it. In this
case, set the `handleMeta` property to the id of the source handling metadata.
Any mapping should be defined on the handling source.

Finally, you may set `handleMeta` to `false` to signal that no metadata should
be stored for this source.

## Actions
Actions are serializable objects that are dispatched to Integreat, and may be
queued when appropriate. It is a key point that they are serializable, as they
allows them to be put in a database persisted queue and be picked up of another
Intergreat instance in another process.

An action looks like this:
```
{
  type: <actionType>,
  payload: <payload>,
  schedule: <schedule object>
}
```

`type` is one [of the action types](#available-actions) that comes with
Integreat and `payload` are data for this action. `schedule` is a
[schedule definition](#schedule-definition) (the fully parsed format from
Later).

### Returned from actions
Retrieving from a source will return an object of the following format:

```
{
  status: <statusCode>,
  data: <object>
  error: <string>
}
```

The `status` will be one of the following status codes:
- `ok`
- `queued`
- `notfound`
- `noaction`
- `timeout`
- `autherror`
- `noaccess`
- `error`

On `ok` status, the retrieved data will be set on the `data` property. This will
usually be mapped data in [Integreat's data format](#the-data-format), but
essentially, the data format depends on which action it comes from.

In case of any other status than `ok` or `queued`, there will be no `data`, and
instead the `error` property will be set to an error message, usually returned
from the adapter.

`data` and `error` will never be set at the same time.

The same principles applies when an action is sending data or performing an
action other than receiving data. On success, the returned `status` will be
`ok`, and the `data` property will hold whatever the adapter returns. There is
no guaranty on the returned data format in these cases.

### The data format
Items will be in the following format:

```
{
  id: <string>,
  type: <datatype>,
  createdAt: <date>,
  updatedAt: <date>,
  attributes: {
    <attrKey>: <value>,
    ...
  },
  relationships: {
    <relKey>: {id: <string>, type: <datatype>},
    <relKey: [{id: <string>, type: <datatype>, ...],
    ...
  }
}
```

### Available actions

#### `GET`
Gets items from a source, using the `get` endpoint. Returned in the `data`
property is an array of mapped object, in
[Integreat's data format](#the-data-format).

Example GET action:
```javascript
{
  type: 'GET',
  payload: {
    type: 'entry'
  }
}
```

In the example above, the source is inferred from the payload `type` property.
Override this by supplying the id of a source as a `source` property.

#### `GET_ONE`
Gets one item from a source, using the `getOne` endpoint. Returned in the `data`
property is a mapped object, in [Integreat's data format](#the-data-format).

Example GET_ONE action:
```javascript
{
  type: 'GET_ONE',
  payload: {
    id: 'ent1',
    type: 'entry'
  }
}
```

In the example above, the source is inferred from the payload `type` property.
Override this by supplying the id of a source as a `source` property.

#### `GET_RAW`
Gets any data returned from the source, using the given `uri` in the `payload`.
Returned in the `data` property is whatever is returned from the adapter,
without any mapping at all.

Example GET_RAW action:
```javascript
{
  type: 'GET_RAW',
  payload: {
    uri: 'http://api.com/entries',
    source: 'entries'
  }
}
```

In the example above, the source is specified by the payload `source` property.
GET_RAW does not support inferring source from type.

#### `GET_META`
Gets metadata for a source, using the `getMeta` endpoint.

The action returns an object with a `data` property, which contains the `source`
(the source id) and `meta` object with the metadata set as properties.

Example GET_META action:
```javascript
{
  type: 'GET_META',
  payload: {
    source: 'entries',
    keys: ['lastSyncedAt', 'status']
  }
}
```

This will return data in the following form:
```javascript
{
  status: 'ok',
  data: {
    source: 'entries',
    meta: {
      lastSyncedAt: 1503164431861,
      status: 'ready'
    }
  }
}
```

If the action has no `keys`, all metadata set on the source will be retrieved.
The `keys` property may be an array of keys to retrieve several in one request,
or a single key.

Note that the source must be set up to handle metadata. See
[Configuring metadata](#configuring-metadata) for more.

#### `SET_ONE`
Sends data for one item to a source, using the `setOne` endpoint. Returned in the
`data` property is whatever the adapter returns.

The data to send is provided in the payload `data` property, and must given in
[Integreat's data format](#the-data-format).

Example SET_ONE action:
```javascript
{
  type: 'SET_ONE',
  payload: {
    data: {
      id: 'ent1',
      type: 'entry'
    }
  }
}
```

In the example above, the source is inferred from the `type` property of `data`
in the payload. This may be overridden  by supplying the id of a source as a
`source` property on the `payload` object.

#### `SET_META`
Sets metadata on a source, using the `setMeta` endpoint. Returned in the `data`
property is whatever the adapter returns.

The payload should contain the `source` to get metadata for (the source id), and
a `meta` object, with all metadata to set as properties.

Example SET_META action:
```javascript
{
  type: 'SET_META',
  payload: {
    source: 'entries',
    meta: {
      lastSyncedAt: Date.now()
    }
  }
}
```

Note that the source must be set up to handle metadata. See
[Configuring metadata](#configuring-metadata) for more.

#### `RUN`
This action runs a job with a specified `worker`, giving it a `params` object.
Everything from there on, is up to the worker, including what will be returned
as `data` if the worker runs without errors.

Currently, Integreat comes with one worker, named [`sync`](#the-sync-job).

Example RUN action:
```javascript
{
  type: 'RUN',
  payload: {
    worker: 'sync',
    params: {
      from: 'entries',
      to: 'store',
      type: 'entry',
      retrieve: 'all'
    }
  }
}
```

In the example above, the `sync` job is run, with the `params` it needs to sync
from one source to another. The format of the `params` object varies from worker
to worker.

## Adapters
Interface:
- `retrieve(url, [auth])`
- `send(url, data, [auth], [method])`
- `normalize(data, [path])`
- `serialize(data, [path])`

Available adapters:
- `json`
- `couchdb`

## Authentication
Definition format:
```
{
  id: <id>,
  strategy: <strategy id>,
  options: {
    ...
  }
}
```

At runtime, the specified strategy is used to authenticate requests. The
strategy is given the `options` payload and returns an object with the
following interface:

```javascript
{
  isAuthenticated () {},    // Returns true when authenticated
  await authenticate () {}, // Returns true when authenticated
  getAuthObject () {},      // Returns auth information as an object
  getAuthHeaders () {}      // Returns auth headers as an object
}
```

## Pipeline functions
- Item `transform(item)`
- Item `filter(item)`
- Attribute `format(value)`

Default formats:
- `date`
- `float`
- `integer`
- `not`

## Running jobs
The jobs interface accepts id of a `worker` and a `params` object passed to the
worker. There are a couple of workers included in Integreat, like `sync` and
`expire`. A job may be dispatched as a `RUN` action, with the job definition as
the payload.

To schedule jobs, [schedule definitions](#schedule-definition) may be passed to
the `schedule` method of the Integreat instance. Each schedule consists of some
properties for defining the schedule, and an action to be dispatched.

### Job definition
```
{
  worker: <workerId>,
  params: {
    ...
  }
}
```

### Schedule definition
```
{
  schedule: <schedule>,
  job: <job definition>,
}
```

The `schedule` format is directly borrowed from
[Later](http://bunkat.github.io/later/schedules.html) (also accepts the basic or
composite schedule formats on the `schedule` property, as well as the [text
format](http://bunkat.github.io/later/parsers.html#text)).

The following time periods are supported:
- `s`: Seconds in a minute (0-59)
- `m`: Minutes in an hour (0-59)
- `h`: Hours in a day (0-23)
- `t`: Time of the day, as seconds since midnight (0-86399)
- `D`: Days of the month (1-maximum number of days in the month, 0 to specifies
last day of month)
- `d`: Days of the week (1-7, starting with Sunday)
- `dc`: Days of week count, (1-maximum weeks of the month, 0 specifies last in
the month). Use together with `d` to get first Wednesday every month, etc.
- `dy`: Days of year (1 to maximum number of days in the year, 0
specifies last day of year).
- `wm`: Weeks of the month (1-maximum number of weeks in the month, 0 for last
week of the month.). First week of the month is the week containing the 1st, and
weeks start on Sunday.
- `wy`: [ISO weeks of the year](http://en.wikipedia.org/wiki/ISO_week_date)
(1-maximum number of ISO weeks in the year, 0 is the last ISO week of the year).
- `M`: Months of the year (1-12)
- `Y`: Years (1970-2099)

See Later's documentation on
[time periods](http://bunkat.github.io/later/time-periods.html) for more.

Example schedule running a job at 2 am every weekday:
```javascript
{
  schedule: {d: [2,3,4,5,6], h: [2]},
  job: {
    worker: 'sync',
    params: {
      from: 'src1',
      to: 'src2',
      type: 'entry'
    }
  }
}
```

To run a job every hour, use `{m: [0]}` or simply `'every hour'`.

### The sync job
The sync job will retrieve items from one source and set them on another. There
are different options for how to retrieve items, ranging from a crude retrieval
of all items on every sync, to a more fine grained approach where only items
that have been updated since last sync, will be synced.

The simplest job definition would look like this, where all items would be
retrieved from the source and set on the target:
```
{
  worker: 'sync',
  params: {
    from: <sourceid>,
    to: <targetid>,
    type: <itemtype>,
    retrieve: 'all'
  }
}
```

*Not implemented yet:* To retrieve only new items, change the `retrieve`
property to `updated`. In this case, the job will get the last retrieved
timestamp from the source, and get only newer items.

### The expire job
Not implemented yet.

## Debugging
Run Integreat with env variable `DEBUG=great`, to receive debug messages.
