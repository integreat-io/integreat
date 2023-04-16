# ![Integreat](media/logo.png)

An integration layer for node.js.

[![npm Version](https://img.shields.io/npm/v/integreat.svg)](https://www.npmjs.com/package/integreat)
[![Build Status](https://travis-ci.org/integreat-io/integreat.svg?branch=master)](https://travis-ci.org/integreat-io/integreat)
[![Coverage Status](https://coveralls.io/repos/github/integreat-io/integreat/badge.svg?branch=master)](https://coveralls.io/github/integreat-io/integreat?branch=master)
[![Maintainability](https://api.codeclimate.com/v1/badges/a5bd9841a47ff9f74577/maintainability)](https://codeclimate.com/github/integreat-io/integreat/maintainability)

**Note:** We're closing in on a more stable version, but there might still be
a few changes coming before v1.0. We encourage trying out and experimenting with
Integreat, and we highly appreciate feedback, but know that some things might
still change.

The basic idea of Integreat is to make it easy to define how to send data to and
receive data from a set of [**services**](#services), and expose them through a
well defined interface, abstracting away the specifics of each service.

There are a few concepts that makes this possible:

- [**Transporters**](#transporters) and [**adapters**](#adapters) speak the
  language of different types of services and standards of data exchange, and
  does the basic translation to and from the structures used by Integreat. You
  deal with familiar JavasScript objects, arrays, and primitive data types,
  regardless of what the service expects.
- [**Mutation pipelines**](#mutations) let you define how the data coming from
  or going to a service should be transformed. This includes changing the overal
  structure, renaming properties, transforming and filtering values with
  transformer functions, etc. You may also provide your own transformer
  functions.
- [**Schemas**](#schemas) serve as a common normalization of data between
  services. You define your own schemas and mutate data to and from them,
  enabling inter-service sharing of data. If you have data in one schema, you
  may send it to any service where you have set up the right mutations for this
  schema, again abstracting away all service details.

All configuration is done through basic JSON-friendly structures, and you define
your services with different endpoints, mutation pipelines, authentication
schemes, etc.

Your configuration is spun up as an Integreat instance. To send and retrieve
data, you dispatch [**actions**](#actions) to your instance and get
[**response**](#action-response) objects back.

```
                   ____________________________________________________
                  |                                                   |
                  |                Integreat instance                 |
Action ----|      |                                                   |
           |-> Dispatch <-> Schema <-> Mutation <-> Adapter <-> Transporter <-> Service
Response <-|      |                                                   |
                  |___________________________________________________|
```

To deal with security and permissions, Integreat has a concept of an ident.
Other authentication schemes may be mapped to Integreat's ident scheme, to
provide data security from a service to another service or to the dispatched
action. A ground principle is that nothing that enters Integreat from an
authenticated service, will leave Integreat unauthenticated. What this means,
though, depends on how you define your services.

# Usage

## Install

Requires node v18.

Install from npm:

```
npm install integreat
```

You will probably also need some [transporters](#transporters) and
[adapters](#adapters), and the basic transformers in
[`integreat-transformers`](https://github.com/integreat-io/integreat-transformers).

## Basic example

The following is the "hello world" example of Integreat. As most hello world
examples, this is a bit too trivial a use case to demonstrate the real
usefulness of Integreat, but it shows you the simplest setup possible.

Here, we fetch cat facts from the API endpoint
'https://cat-fact.herokuapp.com/facts', which returns data in JSON and requires
no authentication. The returned list of facts are mutated and cast to the `fact`
schema. We only fetch data _from_ the service, and no data is sent _to_ it.

```javascript
import Integreat from 'integreat'
import httpTransporter from 'integreat-transporter-http'
import jsonAdapter from 'integreat-adapter-json'

const schemas = [
  {
    id: 'fact', // The id of the schema
    shape: {
      // The fields of the type
      id: 'string', // An id field will always be included, but we define it here for readability
      text: 'string', // The text of the cat fact
      createdAt: 'date', // The created date (`createdAt` and `updatedAt` will always be dates)
    },
    access: { allow: 'all' }, // No access restrictions
  },
]

const services = [
  {
    id: 'catfact', // The id of the service
    transporter: 'http', // Use the http transporter
    adapters: ['json'], // Run the request and the response through the json adapter
    options: {
      // Options for the transporter
      uri: 'https://cat-fact.herokuapp.com/facts', // Only the uri is needed here
    },
    endpoints: [
      {
        mutation: {
          $direction: 'from', // We're mutating data _from_ the service
          // Here we're mutating `response.data` and "setting it back" where we found it ...
          'response.data': [
            'response.data[]',
            {
              $iterate: true, // Mutate each item in an array
              id: '_id', // The id is called `_id` the data from the service
              text: 'text', // text is called `text`
              createdAt: 'createdAt', // Creation date is called `createdAt`
            },
            { $cast: 'fact' }, // Cast the data in the `fact` schema
          ],
        },
      },
    ],
  },
]

// Create the Integreat instance from our definitions and provide the
// transporters and adapters we require.
const great = Integreat.create(
  { schemas, services },
  { transporters: { http: httpTransporter }, adapters: { json: jsonAdapter } }
)

// Prepare an action to fetch all cat facts from the service `catfact`
const action = { type: 'GET', payload: { type: 'fact', service: 'catfact' } }

// Dispatch the action and get the response
const response = await great.dispatch(action)
```

The `response` object will look like this:

```javascript
{
   status: 'ok',
   data: [
    {
      id: '58e008780aac31001185ed05',
      $type: 'fact',
      text: 'Owning a cat can reduce the risk of stroke and heart attack by a third.',
      createdAt: new Date('2018-03-29T20:20:03.844Z')
    },
    // ...
  ]
}
```

# Integreat concepts

As mentioned in the introduction, the building blocks of Integreat are services,
transporters and adapters, mutation pipelines, and schemas.

## Services

A service is the API, database, FTP server, queue, etc. that you want to get
data from and/or set data to. We pass on a set of service definitions to
Integreat, specifying what transporter, adapters, authentication schemas it
requires, in adition to defining the different endpoints available on the
service, how they should be called, and how data should be mutated in each case.

We'll get back to the details of all of this in turn, but first we want to
highlight how central the concept of a service is to Integreat. Basically, in
Integreat "everything is a service". A simple REST/JSON API is a service, a
database is a service, and everything external you want to communicate with are
services. Want to set up a queue to handle actions one by one? That's a service.
Want to cache data in a memory store? That's a service. Want to schedule actions
to run on intervals? That's a service to. By simply defining services and their
specifics, you may set up a variety of different types of configurations with
the same few building blocks. This is very powerful as soon as you get into the
right mindset.

Services are configured by service definitions, and tells Integreat how to
fetch data from a service, how to mutate this data to schemas, and how to send
data back to the service.

The service definition object includes the transporter id, adapter ids, any
authentication method, the endpoints for fetching from and sending to the
service, mutations that data to all endpoints will pass through, and options
for transporters, adapters, etc.

```javascript
{
  id: <service id>,
  transporter: <transporter id>,
  adatpers: [<adapter id>, <adapter id>, ...],
  auth: <auth id>,
  meta: <type id>,
  options: {...},
  mutation: <mutation pipeline>,
  endpoints: [
    <endpoint definition>,
    ...
  ]
}
```

Service definitions are passed to Integreat on creation through the
`Integreat.create()` function. There is no way to change service defintions
after creation.

See [mutations](#mutations) for a description of how to define the mutation
pipeline for a service.

The `auth` property should normally be set to the id of an
[auth definition](#service-authentication), if the service requires
authentication. In cases where the service is authenticated by other means, e.g.
by including username and password in the uri, set the `auth` property to `true`
to signal that this is an authenticated service.

### Endpoints

A service will have at least one endpoint, but often there will be several. An
endpoint is a definition of one of the ways Integreat may interact with a
service. You decide how you want to set up the endpoints and what is the right
"endpoint design" for a service, but there might be one endpoint for each
operation that can be done with a type of data.

For example, let's say you have a simple REST API with blog articles and
authors. There will most likely be an endpoint to fetch all (or some) articles,
one endpoint for fetching one article by id, one endpoint for creating an
article, one for updating an article, and so on. And you'll have similar
endpoints for authors, one endpoint for fetching all, one for fetching one by
id, one endpoint for creating an author, etc. As this is REST, each endpoint
will address a different combination of urls and http verbs (through the
transporter).

As another example, you may be accessing a database of articles and authors
directly. The configuration details will be very different than for a REST API,
but you'll probably have the same endpoints, fetching all articles, fetching
one, creating, updating, and the same all over for users. Instead of urls and
http verbs, as for REST, these endpoints will address different databases and
different database operations (through the transporter).

> Note: This is not to say that Integreat requires you to set up endpoints
> exactly as described in these examples, it might be that you would like to set
> up an endpoint that handles many of these cases. The intention here is just to
> give you an understanding of what an endpoint is in Integreat.

When you dispatch an action, Integreat will figure out what service and what
endpoint to send the action to. The target service is often specified in the
action payload with the `service` property, but if not, the default service of
the schema specified with the payload `type` property, will be used.

The matching to an endpoint is done by finding the endpoint whose `match` object
matches the action with most accuracy. The rules of the endpoint matching is
describe in more details [below](#match-properties).

Here's the format of an endpoint definition:

```javascript
{
  id: <endpoint id>,
  match: {
    type: <schema id>,
    scope: <'collection'|'member'|'members'|'all'>,
    action: <action type>,
    params: {...},
    incoming: <boolean>,
    filters: {...}
  },
  mutation: <mutation pipeline>,
  options: {...},
  allowRawRequest: <boolean>,
  allowRawResponse: <boolean>
}
```

All of these properties are optional. An empty endpoint defintion object will
match anything, pass on the action to the transporter untouched, and relay any
response coming back. This might be what you need, but often you'll want to
specify a few things:

- `id`: The endpoint may have an id, which you may use to specify that you want
  an action to go to this particular id. However, most of the time you'll set
  up the `match` object so that Integreat will decide what endpoint to use for
  the action you dispatch.
- `match`: The match object is used to decide the right endpoint for an action.
  More one this in the [Match properties](#match-properties) section.
- `mutation`: A mutation pipeline for the endpoint. The pipeline is run for both
  actions going to a service and the response coming back, so keep this in mind
  when you set up this pipeline. See [Mutation pipelines](#mutation-pipelines)
  for more on how to define the mutation.
- `options`: This object will be passed on to the transporter and may contain
  any properties that are meaningful to the transporter. You may also add other
  properties for use in your mutations, but keep in mind that they will be sent
  to the transporter. The endpoint `options` object is merged with the service
  `options` object. Endpoint properties will override equally named service
  properties, but this is done through deep merging, so child objects will be
  merged as well.

#### Match properties

An endpoint may specify none or more of the following match properties:

- `type`: When set, the endpoint will only be used for actions with the
  specified schema type (the schema's id). `type` may also be an array of types,
  matching any one of the schemas in the list.
- `scope`: May be `member`, `members`, `collection`, or `all`, to specify that
  the endpoint should be used to request one item (member) by id, several items
  by ids (members), or an entire collection of items. Setting this to `member`
  or `members` will only match actions with a payload `id` property, and the
  `id` should be an array of ids for `members`. Not setting this property, or
  setting it to `all`, signals an endpoint that will work for all scopes.
- `action`: May be set to the type string of an action. The endpoint will match
  only actions of this type. When this is not specified, any action type will
  match. `action` may also be a list of action types, matching any of these.
- `params`: This object should list all params that this endpoint supports. A
  param in this context is any property on the action payload except `type`,
  `id`, or `data`. Use the param name as key on this object and set the value to
  `true` if it is required, and `false` if it is optional. When matching
  endpoints, an action will only match if it has all the required params, and in
  case several match, the endpoint with more specified params will be preferred.
- `incoming`: If this is `true`, it will only match incoming actions, if `false`
  only outgoing, and if not set, it will match both.
- `filters`: The filter object specifies a set of tests that needs to match an
  action. The key of the object is a full dot notation path for the action
  object, e.g. `payload.onlyArchived` and the value is a
  [JSON Schema Validation object](https://json-schema.org/draft/2020-12/json-schema-validation.html).

> Editor's note: Describe what incoming actions are, and give more details on
> filters.

There might be cases where several endpoints match an action, and in these cases
the endpoint with the highest level of specificity will be used. E.g., for a
`GET` action asking for resources of type `entry`, an endpoint with both
`action: 'GET'` and `type: 'entry'` is picked over an endpoint matching all
`GET` actions regardless of type. For `params` and `filters` this is decided by
the highest number of properties on these objects.

The order of the endpoints in the `endpoints` list matters only when two
endpoints are equally specified with the same match properties specified. Then
the first one is used.

When no match properties are set, the endpoint will match any actions, as long
as no other endpoints match.

Finally, if an action specifies the endpoint id with the `endpointId` payload
property, this overrides all else, and the endpoint with the id is used
regardless of how the match object would apply.

Example service definition with endpoint match object:

```javascript
{
  id: 'entries',
  transporter: 'http',
  endpoints: [
    {
      match: {
        type: 'entry',
        action: 'GET',
        scope: 'collection',
        params: {
          author: true,
          archive: false
        }
      },
      options: {
        uri: 'https://example.api.com/1.0/{author}/{type}_log?archive={archive}'
      }
    }
  ],
  // ...
}
```

## Transporters

A transporter handles all the details of sending and receiving data to and from
a service. When dispatching an action to a service, the action will be handled
in a relevant manner for the type of service the transporter supports, e.g.
sending an http requrest for the HTTP transporter, or doing a query to a
database for the MongoDb transporter. Some transporters may also support
listening to a service, e.g. the HTTP transporter listing for incoming requests
or the MQTT transporter subscribing to events on a topic.

Integreat has transporters for some common cases, and more may come:

- [Bull](https://github.com/integreat-io/integreat-transporter-bull)
- [FTP](https://github.com/integreat-io/integreat-transporter-ftp)
- [HTTP](https://github.com/integreat-io/integreat-transporter-http)
- [MongoDb](https://github.com/integreat-io/integreat-transporter-mongodb)
- [MQTT](https://github.com/integreat-io/integreat-transporter-mqtt)
- [Redis](https://github.com/integreat-io/integreat-transporter-redis)

You may write your own transporters if your case is not covered by any of these.
Documentation on developing transporters are coming.

Integreat will handle the transporters based on you configurations, but there
are some specifics to each transporter, like HTTP needing an `uri` option or
MongoDb needing a `collection` option. See the documentation of each transporter
for more.

## Adapters

Adapters are working together with transporters to prepare the incoming and
outgoing data in accordance with the type of services they support.

As an example, the HTTP transporter will return data from a response as a
string, since there is no common way to treat the response body. So for a JSON
API, you will configure the JSON adapter to make sure the data from the
mutations are sent as a JSON string, and that the JSON comming back from the
service is parsed before mutation starts. For a service using XML, you would
instead set up the XML adapter, and perhaps also the SOAP adapter, to again
stringify and parse the data going back and forth.

The MongoDb transporter, on the other hand, does not require any adapters, as
documents from the database will always come as arrays and object, and may be
fed directly into the mutation pipelines.

Integreat currently have the following adapters:

- [CSV](https://github.com/integreat-io/integreat-adapter-csv)
- [JSON](https://github.com/integreat-io/integreat-adapter-json)
- [SOAP](https://github.com/integreat-io/integreat-adapter-soap)
- [Url encoded form data](https://github.com/integreat-io/integreat-adapter-form)
- [XML](https://github.com/integreat-io/integreat-adapter-xml)

You may write your own adapters as well, and documentation on this is coming.

## Mutations

Both on the service and on endpoints, you define mutation pipelines. The service
mutation is run before the endpoint mutation for data coming from a service, and
in the oposite order when going to a service.

A nice, but sometimes complicated, thing about mutations, is that they are run
in both directions. They are by default defined for mutating data coming _from_
a service, and will be run in reverse for data going _to_ a service. In some
cases this reversing of the pipeline will work as expected without modifications
-- you define the mutation pipeline for data coming _from_ the service, and the
reversed pipeline works _to_ as well. But many times you need to make
adjustments and sometimes you'll have to have separate steps based on the
direction. We'll get into more details in the following.

A mutation pipeline consists of one or more steps that the data will go through,
before coming out on the other in the desired shape. It helps picturing this as
an actual pipeline. After each step, data will be in a different shape, and this
is the input to the next step.

You define a pipeline in Integreat with an array, although for a pipeline with
only one step, you may skip the array for simplicity.

Each step may be one of the following:

- [**A dot notation path**](#dot-notation-paths), e.g. `path.to.data`. The data
  at that path will be extracted, and will be provided as the data to the next
  step in the pipeline. When going in reverse, the data will be set on that path
  instead.
- **A mutation object** is an object that basically describes the object you
  want as a result, where the keys are dot notation paths and the values are
  mutation pipelines. Each pipeline on the mutation object will be run on the
  data, and then set on the path, resulting in an object that will be passed on
  to the next step.
- **A transform object** letting you run a transformer function on the data,
  e.g. `{ $transform: 'number' }` to transform the value into a number, or
  `undefined` if not possible.
- **A filter object** that will run a transformer function on the data and
  filter away any items not resulting in a truthy value. As an example,
  `{ $filter: 'boolean' }` will filter away anything that is not convertable to
  `true` in JS rules. When applied to an array, you'll get an array where items
  are filtered away. For an object or a plain value, filtering away will means
  `undefined` is passed on to the next step in the pipeline.
- **An if object** that runs a `then` pipeline if the provided pipeline returns
  truthy, and the `else` pipeline if it returns falsy.
- **A cast object**, e.g. `{ $cast: 'author' }` that casts the data into a
  schema, removing all properties that is not part of the shape of the schema,
  and transforming all values to the expected types or `undefined` if not
  possible.

### Dot notation paths

At its most basic, a dot notation path is just a property key, like `content`.
You may dive into a data structure by adding a key from the next level,
separated by a dot, like `content.articles`. With an object like this:

```javascript
{
  content: {
    articles: [{ id: '1' }, { id: '2' }],
    authors: [{ id: 'john' }]
  }
}
```

... the path `content.articles` will give you the array
`[{ id: '1' }, { id: '2' }]`.

You may add brackets to the path to traverse into arrays, e.g.
`content.articles[0]` will give you the object `{ id: '1' }`, and
`content.articles[0].id` will give you `'1'`.

Empty brackets, like `content.articles[]` will ensure that you get an array
back. If the data at the path is an array, this will return the same as
`content.articles`, but if the path returns an object or a plain value, it will
be returned in an array.

When mapping data _to_ a service, the paths are used to reconstruct the data
format the service expects. Only properties included in the paths will be
created.

Arrays are reconstructed with any object or value at the first index, unless a
single, non-negative index is specified in the path.

You may use a carret `^` to go one level up -- to the parent -- in the data
(after going down), so after `content.articles`, the path `^.authors` will
return `[{ id: 'john' }]`. Arrays count as one level, so after
`content.articles[0]` you will need to go up twice like so: `^.^.authors`.

A double carret `^^` takes you to the top -- the root -- so after
`content.articles[0].id`, `^^.content.authors` returns `[{ id: 'john' }]`.

Carret notations -- parents and roots -- does not currently work in reverse, but
they might in a future version.

## Schemas

A central idea to Integreat, is that any integration has two sides; the getting
of data from one service and the sending of data to another. Instead of setting
up an integration directly from A to B, you have a schema in middle, and
configure how data from A will be mutated to a schema, and then have data in
that schema will be mutated and sent to B.

This is a useful abstraction, and if you ever need to change one side, you can
do so without involving the other side. If you need to switch out service B with
service C, you can do so without involving the configuration of service A, or
you can send data to both B and C, using the same setup for service A.

To be clear, you can setup flows without schemas in Integreat, but at the loss
of this flexibility and maintainability.

A schema describe the data you expected to get out of Integreat, or send through
it. You basically define the fields and their types, and may then cast data to
that shape.

```javascript
{
  id: <schema id>,
  plural: <the id in plural>,
  service: <the default service for this schema>,
  shape: {
    <fieldId>: <field type>,
    <fieldId>: {
      $cast: <field type>,
      $default: <default value>
      $const: <value that will override any other value>
    },
  },
  access: <access def>
}
```

- `id`: The id of the schema, used to reference it in actions (the payload
  `type`), when casting to the schema with `{ $cast: '<schema id>' }`, and to
  signal what schema a data object is cast to (the `$type` prop on typed data
  items). The convention is to use singular mode for the `id`, e.g. if your
  defining a schema for articles, you would give it the id `'article'`.
- `plural`: When the plural of `id` is not simply a matter of adding an `'s'`,
  you may specify the plural mode here. E.g. `id: 'entry'` would have
  `plural: 'entries'`. This is not used by Integreat right now, but it may be
  used in the future for error messages, generating APIs from schemas, etc.
- `service`: You may specify a default service for the schema when it makes
  sense. This allows you to dispatch an action for a type without specifying the
  target service, e.g. `{ type: 'GET', payload: { type: 'article' } }`, and have
  Integreat use the default service. This is a way of hiding configuration
  details from the code dispatching the actions, and you may also change the
  default service without changing the dispatching code if need be. You may
  always override this by specifying a `service` on the action payload.
- `shape`: This is where you define all the fields, see
  [the section below](#the-shape-of-a-schema).
- `access`: Integreat lets you define authorization schemes per schema. All use
  of data cast to a schema will then be controlled by the rules you set here.
  See [Access rules](#access-rules) below for details on these rules. Note that
  `access` is optional, but when you get data from a service where any form of
  authentication is used to access the data, you will not be able to do anything
  with the data unless you cast it to a schema with `access` set up (or
  specifically says that you allow raw data from that endpoint).

### The shape of a schema

The shape is defined by an object where each key is the id of a field, which may
contain only alphanumeric characters, and may not start with a digit. A schema
cannot have the same id as a primitive type (see list below).

The values on this object define the types of the fields and a few other
optional features:

```javascript
{
  $cast: <field type>,
  $default: <default value>
  $const: <value that will override any other value>
}
```

The `$cast` prop sets the type of the field (what it will be "cast" to). The
available primitive types, are `string`, `integer`, `float` (or `number`),
`boolean`, and `date`. A field may also have another schema as its type, in
which case the id of the schema is set in `$cast`. An example can be an
`article` schema with an `author` field of type `user`, referring to a schema
with id `user`. When casting the `article`, data on the `author` prop will be
cast with the `user` schema.

The `$default` value will be used when the data object being cast to this schema,
has not got any value for this field. Default is `undefined`.

The `$const` value override any value you provide to the field. It may be useful
if you want a field to always have a fixed value.

When only setting the field type, you don't need to provide the entire object,
you can just provide the type string.

Example schema:

```javascript
{
  id: 'article',
  shape: {

  },
  access: 'all'
}
```

### Access rules

Set the `access` property on a schema to enforce permission checking. This
applies to any service that provides data in this schema.

The simplest access rule is `auth`, which means that anyone can do anything with
the data of this schema, as long as they are authenticated. Being authenticated
in this context, means that the dispatched action has an `ident` in the `meta`
object. See [the section on idents](#idents) for more on this.

Example of a schema with an access rule:

```javascript
{
  id: 'article',
  shape: {
    // ...
  },
  access: 'auth'
}
```

To signal that the schema really has no need for authorization, use `all`.
This is not the same as not setting the `auth` prop, as `all` will override
Integreat's principle of not letting authorized data out of Integreat without
an access rule. `all` allows anybody to access the data, even the
unauthenticated.

On the other end of the spectrum, `none` will allow no one to access data cast
to this schema, no matter who they are.

For more fine-grained rules, set `access` to an access definition object with
rules telling Integreat which rights to require when performing different
actions with a given schema. These rules apply to the [idents](#idents) set on
the action `meta` object.

The following access rule props are available:

- `allow`: Set to `all`, `auth`, or `none`, to give access to everybody, only
  the authenticated, or no one at all. This is what we describe in short form
  above, where we provided this string instead of a access rule object.
- `role`: Authorize only idents with this `role`. May also be an array of
  strings (not implemented yet).
- `ident`: Authorize only idents with this precise `id`. May also be an array
  (not implemented yet).
- `roleFromField`: Same as `role`, except the role is gotten from a field in the
  schema. When authorizing data cast to this schema, the value of the role field
  needs to be identical to (one of) the role(s) of the ident.
- `identFromField` - The same as `roleFromField`, but for an ident id.

In addition, you may override the general access rules of a schema with specific
rules for a type of action, by setting an `action` object with access rules for
action types. Here's an example of an access definition for allowing all
authorized idents to `GET` data in a certain shema, requiring the role `admin`
for `SET`s, and disallowing all other actions with the general rule
`allow: 'none'`:

```javascript
{
  id: 'article',
  shape: {
    // ...
  },
  access: {
    allow: 'none',
    actions: {
      GET: { allow: 'auth' },
      SET: { role: 'admin' }
    }
  }
}
```

Note that these action specific rules only applies to actions being sent to a
service. Some actions will never reach a service, but will instead trigger other
actions, and access will be granted or rejected only for the actions that are
about to be sent to a service. E.g. when you dispatch a `SYNC` action, it starts
off by dispatching one or more `GET` actions. The `SYNC` action is not subjected
to any access rules, but the `GET` actions are, and so the `SYNC` will fail if
one of the `GET` is rejected.

Another example, intended for authorizing only the ident matching a user:

```javascript
{
  id: 'user',
  shape: {
    // ...
  },
  access: { identFromField: 'id' }
}
```

Here, only actions where the ident id is the same as the id of the user data,
will be allowed. This means that authenticated users (idents) may only
only access their own user data.

## Actions

Actions are serializable objects that are dispatched to Integreat. It is a
important that they are serializable, as this allows them to for instance be put
in a database persisted queue and be picked up of another Intergreat instance in
another process. Note that Date objects are considered serializable, as they are
converted to ISO date strings when needed.

An action looks like this:

```javascript
{
  type: <action type>,
  payload: <payload>,
  meta: <meta properties>
}
```

- `type`: This is the id of one [of the action handlers](#available-actions)
  that comes with Integreat. When you dispatch an action, it is handed off to
  this handler (after a few inital preperations). You may write your own action
  handlers as well.
- `payload`: Holds parameters and [data](#typed-data) for this action. There are
  some reserved [payload properties](#payload-properties), and the rest are
  simply made available to you in the mutation pipeline.
- `meta`: Holds information about the action that does not belong in the
  payload. There are some reserved [meta properties](#meta-properties), but you
  may add your own here too.

When an action is dispatched, it returns a [response object](#action-response).
However, in the mutation pipelines, action handlers, and middleware, the
response object is provided as a fourth property on the action. You will most
likely meet this at least when setting up mutations.

### Payload properties

> Editor's note: Write this

### Meta properties

> Editor's note: Expand on this this

Current meta properties reserved by Integreat:

- `id`: Assigning the action an id. Will be picked up when queueing.
- `queue`: Signals that an action may be queued. May be `true` or a timestamp
- `queuedAt`: Timestamp for when the action was pushed to the queue
- `schedule`: A [schedule definition](#schedule-definition)
- `ident`: The ident to authorize the action with

### Action response

> Editor's note: Expand on this this

Retrieving from a service will return an Intgreat response object of the
following format:

```
{
  status: <status code>,
  data: <object>
  error: <string>
}
```

The `status` will be one of the following status codes:

- `ok`: Everything is well, data is returned as expected
- `queued`: The action has been queued
- `notfound`: Tried to access a resource/endpoint that does not exist
- `noaction`: The action did nothing
- `timeout`: The attempt to perform the action timed out
- `autherror`: An authentication request failed
- `noaccess`: Authentication is required or the provided auth is not enough
- `badrequest`: Request data is not as expected
- `badresponse`: Response data is not as expected
- `error`: Any other error

On `ok` status, the retrieved data will be set on the `data` property. This will
often be [typed data](#typed-data), meaning it has been cast to a schema, or an
array of typed data. However, this is controlled by your service mutations, so
it's all in your hands.

> Editor's note: Is it correct that queues return the id in the data?

When the status is `queued`, the id of the queued action may found in
`response.data.id`. This is the id assigned by the queue, and not necessarily
the same as `action.meta.id`.

In case of any other status than `ok` or `queued`, there will be an `error`
property with an error message, usually returned from the adapter. Any data
returned from the service will still be provided and mutated on the `data` prop.

### Typed data

When you cast data with a schema, the data will be in the following format:

```
{
  id: <string>,
  $type: <schema>,
  createdAt: <date>,
  updatedAt: <date>,
  <key>: <value>,
  <key>: { id: <string>, $ref: <schema> },
  <key: [{ id: <string>, $type: <schema>, ... }],
  ...
}
```

- `id`: The id is mandatory and created by Integreat even when it is not
  included in the schema. If you try to set it to any other type than string,
  Integreat will still force it to be a string. If you don't map anything to the
  id prop, a universally unique id will be generated for you.
- `$type`: Set to the id of the schema by Integreat. This is a signal that the
  data has been cast.
- `createdAt`: This is not mandatory, but has special meaning and will be forced
  to a date when it's included in a schema, regardless of what type you give it.
  When this date is not set in the data, it will be set to the same as
  `updatedAt` (if provided) or to the current date/time.
- `updatedAt`: Just as `createdAt`, this is not mandatory, but will be forced
  to date type. If it is not set, it will be set to the same as `createdAt` (if
  provided) or the current date/time.
- `<key>`: Then follows the values of all the fields specified in the schema.
  Any value not provided in the data will be set to their default value or
  `undefined`. Fields with other schemas as their type, will be an object. If
  only the id is provided in the data, the `{ id: <string>, $ref: <schema id> }`
  format will be used, with `$ref` being the id of the field type schema. When
  more data is provided, Integreat will cast it to the target schema and provide
  the entire data object, or array of objects, with the relevant `$type`.

--- Revised to this point. The following is outdated ---

### Configuring metadata

If a service may send and receive metadata, set the `meta` property to the id of
a schema defining the metadata as its shape.

```
{
  id: 'meta',
  service: <id of service handling the metadata>,
  shape: {
    <metadataKey>: {
      type: <string>
    }
  }
}
```

The `service` property on the type defines the service that holds metadata for
this type. In some cases the service you're defining metadata for and the
service handling these metadata, will be the same, but it is possible to let a
service handle other services' metadata. If you're getting data from a read-only
service, but need to, for instance, set the `lastSyncedAt` metadata for this
store, you'll set up a service as a store for this (the store may also hold
other types of data). Then the read-only store will be defined with
`meta='meta'`, and the `meta` schema will have `service='store'`.

> Editor's note: This is not easy to understand, and the following is wrong. :S

As with other data received and sent to services, make sure to include endpoints
for the service that will hold the metadata, matching the `GET_META` and
`SET_META` actions, or the schema defining the metadata. The way you set up
these endpoints will depend on your service.

Finally, if a service will not have metadata, simply set `meta` to null or skip
it all together.

## Idents and security rules

An ident in Integreat is basically an id unique to one participant in the
security scheme. It is represented by an object, that may also have other
properties to describe the ident's permissions, or to make it possible to map
identities in other systems, to an Integreat ident.

Example ident:

```javascript
{
  id: 'ident1',
  tokens: ['facebook|12345', 'twitter|23456'],
  roles: ['admin']
}
```

The actual value of the `id` is irrelevant to Integreat, as long as it is a
string with A-Z, a-z, 0-9, \_, and -, and it's unique within one Integreat
configuration. This means that mapped values from services may be used as ident
ids, but make sure the id is unique.

`tokens` are other values that may identify this ident. E.g., an api that uses
Twitter OAuth to identify it's users, may provide the `'twitter|23456'` token in
the example above, which will be replaced with this ident when it enters
Integreat.

`roles` are an example of how idents are given permissions. The roles are
custom defined per setup, and may be mapped to roles from other systems. When
setting the auth rules for a service, roles may be used to require that
the request to get data of this schema, an ident with the role `admin` must
be provided.

Actions are authenticated by setting an ident on the `meta.ident` property. It's
up to the code dispatching an action to get hold of the properties of an ident
in a secure way. Once Integreat receives an ident through a dispatch, it will
assume this is accurate information and uphold its part of the security
agreement and only return data and execute actions that the ident have
permissions for.

### Persisting idents

A security scheme with no way of storing the permissions given to each ident,
is of little value. (The only case where this would suffice, is when every
relevant service provided the same ident id, and authorization where done on the
ident id only.)

Integreat uses schemas and services to store idents. In the definition object
passed to `Integreat.create()`, set the id of the schema to use with idents, on
`ident.schema`.

In addition, you may define what fields will match the different props on an
ident:

```javascript
{
  ...,
  ident: {
    type: 'account',
    props: {
      id: 'id',
      roles: 'groups',
      tokens: 'tokens'
    }
  }
}
```

When the prop and the field has the same name, it may be omitted, though it
doesn't hurt to specify it anyway for clarity. The service still have the
final word, as any field that is not defined on the schema, will not survive
casting.

Note that in the example above, the `id` of the data will be used as the ident
`id`. When the id is not suited for this, you will need another field on the
schema that may act as the ident id. In cases where you need to transform the
id from the data in some way, this must be set up as a separate field and the
mutation will dictate how to transform it. In most cases, the `id` will do,
though.

The `service` specified on the schema, will be where the ident are stored,
although that's not a precise way of putting it. The ident is never stored, but
a data item of the specified schema is. The point is just that the ident
system will get the relevant data item and get the relevant fields from it. In
the same way, when storing an ident, a data item of the specified type is
updated with props from the ident – and then sent to the service.

For some setups, this requires certain endpoints to be defined on the service.
To match a token with an ident, the service must have an endpoint that matches
actions like this:

```javascript
{
  type: 'GET',
  payload: {
    type: 'account',
    tokens: 'twitter|23456'
  }
}
```

In this case, `account` is the schema mapped to idents, and the `tokens`
property on the ident is mapped to the `tokens` field on the schema.

To make Integreat complete idents on actions with the persisted data, set it up
with the `completeIdent` middleware:

```javascript
const great = Integreat.create(defs, resources, [
  integreat.middleware.completeIdent,
])
```

This middleware will intercept any action with `meta.ident` and replace it with
the ident item loaded from the designated schema. If the ident has an `id`,
the ident with this id is loaded, otherwise a `withToken` is used to load the
ident with the specified token. If no ident is found, the original ident is
kept.

### Available actions

#### `GET`

Get data from a service. The data is set on the `data` property of the response
object, and may be mutated any way you like. It is recomended, though, that
data from a service is mutated and cast into schemas.

Example GET action:

```javascript
{
  type: 'GET',
  payload: {
    type: 'entry'
  }
}
```

In the example above, the service is inferred from the payload `type` property.
Override this by supplying the id of a service as a `service` property.

By providing an `id` property on `payload`, the item with the given id and type
is fetched, if it exists.

The endpoint will be picked according to the matching properties, unless an
endpoint id is supplied as an `endpoint` property of `payload`.

#### `GET_META`

Get metadata for a service.

> Editor's note: Explain how to set this up.

The `data` of the response from this aciton contains the `service` (the service
id) and `meta` object with the metadata set as properties.

Example `GET_META` action:

```javascript
{
  type: 'GET_META',
  payload: {
    service: 'entries',
    keys: ['lastSyncedAt', 'status']
  }
}
```

This will return data in the following form:

```javascript
{
  status: 'ok',
  data: {
    service: 'entries',
    meta: {
      lastSyncedAt: '2017-08-19T17:40:31.861Z',
      status: 'ready'
    }
  }
}
```

If the action has no `keys`, all metadata set on the service will be retrieved.
The `keys` property may be an array of keys to retrieve several in one request,
or a single key.

Note that the service must be set up to handle metadata. See
[Configuring metadata](#configuring-metadata) for more.

#### `SET`

Send data to a service. The data to send is provided in the payload `data`
property. Recomended practice is to provide the data as
[Integreat's typed data format](#the-data-format) (cast to a schema), and let
mutations on the endpoint change it to the format the service expects.

> Editor's note: Make sure this match the code:

If the service responds to the action with data, it is provided on
`response.data` and may be mutated as you like, just as for a `GET`.

Example `SET` action:

```javascript
{
  type: 'SET',
  payload: {
    type: 'entry',
    data: [
      { id: 'ent1', $type: 'entry' },
      { id: 'ent5', $type: 'entry' }
    ]
  }
}
```

In the example above, the `type` is used to infer the service to send the data
to. You may also provide `service` to make this specific.

The endpoint will be picked according to the matching properties, unless an
endpoint id is supplied as an `endpointId` property of `payload`.

#### `SET_META`

Set metadata on a service. Returned in the `data` property is whatever the
adapter returns. Normal endpoint matching is used, but it's common practice to
set up an endpoint matching the `SET_META` action.

The payload should contain the `service` to get metadata for (the service id),
and a `meta` object, with all metadata to set as properties.

Example `SET_META` action:

```javascript
{
  type: 'SET_META',
  payload: {
    service: 'entries',
    meta: {
      lastSyncedAt: Date.now()
    }
  }
}
```

Note that the service must be set up to handle metadata. See
[Configuring metadata](#configuring-metadata) for more.

#### `DELETE` / `DEL`

Delete data for several items from a service. Returned in the `data` property is
whatever the adapter returns.

The data for the items to delete, is provided in the payload `data` property,
and must given as an array of typed data objects in
[Integreat's data format](#the-data-format), but usually the only field you need
will be the `id`.

Example `DELETE` action:

```javascript
{
  type: 'DELETE',
  payload: {
    type: 'entry',
    data: [
      { id: 'ent1', $type: 'entry' },
      { id: 'ent5', $type: 'entry' }
    ]
  }
}
```

In the example above, a `type` is used to infer the service, but `service` may
also be specified in the payload.

Example `DELETE` action for one item:

```javascript
{
  type: 'DELETE',
  payload: {
    id: 'ent1',
    type: 'entry'
  }
}
```

The endpoint will be picked according to the matching properties, unless an
endpoint id is supplied as an `endpointId` property of `payload`.

The method used for the request defaults to `POST` when `data` is set, and
`DELETE` for the `id` and `type` option, but may be overridden on the endpoint.

`DEL` is a shorthand for `DELETE`.

#### `SYNC`

> Editor's note: This sections need an update.

The `SYNC` action will retrieve items from one service and set them on another.
There are different options for how to retrieve items, ranging from a crude
retrieval of all items on every sync, to a more fine grained approach where only
items that have been updated since last sync, will be synced.

The simplest action definition would look like this, where all items would be
retrieved from the service and set on the target:

```
{
  type: 'SYNC',
  payload: {
    from: <serviceId | params>,
    to: <serviceId | params>,
    type: <itemType>,
    retrieve: 'all'
  }
}
```

The action will dispatch a 'GET' action right away, and then immediately
dispatch a `SET_META` action to update the `lastSyncedAt` date on the service.
The actions to update the target is added to the queue.

To retrieve only new items, change the `retrieve` property to `updated`. In
this case, the action will get the `lastSyncedAt` from the `from` service, and
get only newer items, by passing it the `updatedAfter` param. The action will
also filter out older items, in case the service does not support `updatedAfter`.

If you need to include more params in the actions to get from the `from` service
or set to the `to` service, you may provide a params object for the `from` or
`to` props, with the service id set as a `service` param.

#### `EXPIRE`

With an endpoint for getting expired items, the `EXPIRE` action will fetch
these and delete them from the service. The endpoint may include param for the
current time, either as microseconds since Januar 1, 1970 UTC with param
`{timestamp}` or as the current time in the extended ISO 8601 format
(`YYYY-MM-DDThh:mm:ss.sssZ`) with the `{isodate}` param. To get a time in the
future instead, set `msFromNow` to a positive number of milliseconds to add
to the current time, or set `msFromNow` to a negative number to a time in the
past.

Here's a typical action definition:

```
{
  type: 'EXPIRE',
  payload: {
    service: 'store',
    type: 'entry',
    endpointId: 'getExpired',
    msFromNow: 0
  }
}
```

This will get and map items of type `entry` from the `getExpired` endpoint on
the service `store`, and delete them from the same service. Only an endpoint
specified with an id is allowed, as the consequence of delete all items received
from the wrong endpoint could be quite severe.

Example endpoint uri template for `getExpired` (from a CouchDB service):

```javascript
{
  uri: '/_design/fns/_view/expired?include_docs=true&endkey={timestamp}',
  path: 'rows[].doc'
}
```

### Custom actions

> Editor's note: Update.

You may write your own action handlers to handle dispatched actions just like
the built-in types.

Action handler signature:

```javascript
function (payload, { dispatch, services, schemas, getService }) { ... }
```

An action handler may dispatch new actions with the `dispatch()` method. These
will be passed through the middleware chain just like any other action, so it's
for instance possible to queue actions from an action handler by setting
`action.meta.queue = true`.

The `services` and `schemas` arguments provide all services and schemas set on
objects with their ids as keys.

Finally, `getService()` is a convenience method that will return the relevant
service object when you provide it with a type. An optional second argument may
be set to a service id, in which case the service object with this id will be
returned.

Custom actions are supplied to an Integreat instance on setup, by providing an
object with the key set to the action type your handler will be responsible for,
and the handler function as the value.

```javascript
const actions = {
  `MYACTION`: function (payload, {dispatch}) { ... }
}
const great = Integreat.create(defs, { schemas, services, mappings, actions })
```

Note that if a custom action handler is added with an action type that is
already use by one of Integreat's built-in action handlers, the custom handler
will have precedence. So be careful when you choose an action type, if your
intention is not to replace an existing action handler.

## Transformers

## Service authentication

This definition format is used to authenticate with a service:

```
{
  id: <id>,
  authenticator: <authenticator id>,
  options: {
    ...
  }
}
```

At runtime, the specified authenticator is used to authenticate requests. The
authenticator is given the `options` payload.

### Schedule definition

> Editor's note: Update to reflect the `jobs` format.

```
{
  schedule: <schedule>,
  action: <action definition>,
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

Example schedule running an action at 2 am every weekday:

```javascript
{
  schedule: {d: [2,3,4,5,6], h: [2]},
  action: {
    type: 'SYNC',
    payload: {
      from: 'src1',
      to: 'src2',
      type: 'entry'
    }
  }
}
```

To run an action every hour, use `{m: [0]}` or simply `'every hour'`.

## Writing middleware

You may write middleware to intercept dispatched actions. This may be useful
for logging, debugging, and features like action replay. Also, Integreat's
queue feature is written as a middleware.

A middleware is a function that accepts a `next()` function as only argument,
and returns an async function that will be called with the action on dispatch.
The returned function is expected to call `next()` with the action, and return
the result from the `next()` function, but is not required to do so. The only
requirement is that the functions returns a valid Integreat response object.

Example implementation of a very simple logger middleware:

```javascript
const logger = (next) => async (action) => {
  console.log('Dispatch was called with action', action)
  const response = await next(action)
  console.log('Dispatch completed with response', response)
  return response
}
```

> Editor's note: Update to describe how one gets a dispatch action, and the
> handler action format.

## Queue

> Editor's note: Rewrite.

Integreat comes with a generic queue interface at `integreat.queue`, that must
be setup with a specific queue implementation, for instance
[`integreat-queue-redis`](https://github.com/integreat-io/integreat-queue-redis).

The queue interface is a middleware, that will intercept any dispatched action
with `action.meta.queue` set to `true` or a timestamp, and direct it to the
queue. When the action is later pulled from the queue, it will be dispatched
again, but without the `action.meta.queue` property.

If a dispatched action has a schedule definition at `action.meta.schedule`, it
will be queued for the next timestamp defined by the schedule.

To setup Integreat with a queue:

```javascript
const queue = Integreat.queue(redisQueue(options))
const great = Integreat.create(defs, resources, [queue.middleware])
queue.setDispatch(great.dispatch)
```

`queue.middleware` is the middleware, while `queue.setDispatch` must be called
to tell the queue interface where to dispatch actions pulled from the queue.

## Debugging

Run Integreat with env variable `DEBUG=great`, to receive debug messages.

Some sub modules sends debug messages with the `great:` prefix, so use
`DEBUG=great,great:*` to catch these as well.
