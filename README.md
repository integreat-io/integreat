# ![Integreat](media/logo.png)

An integration layer for node.js.

[![npm Version](https://img.shields.io/npm/v/integreat.svg)](https://www.npmjs.com/package/integreat)
[![Build Status](https://travis-ci.org/integreat-io/integreat.svg?branch=master)](https://travis-ci.org/integreat-io/integreat)
[![Coverage Status](https://coveralls.io/repos/github/integreat-io/integreat/badge.svg?branch=master)](https://coveralls.io/github/integreat-io/integreat?branch=master)
[![Maintainability](https://api.codeclimate.com/v1/badges/a5bd9841a47ff9f74577/maintainability)](https://codeclimate.com/github/integreat-io/integreat/maintainability)

**Note:** We're still changing the api rather drastically from release to
release. We encourage trying it out and experimenting with Integreat, and we
highly appreciate feedback, but know that anything might change.

The basic idea of Integreat is to make it easy to define a set of data services
and expose them through a well defined interface, to abstract away the specifics
of each service, and map their data to defined schemas.

This is done through:

- adapters, that does all the hard work of communicating with the different
  services
- a definition format, for setting up each service with the right adapter and
  parameters
- a `dispatch()` function that sends actions to the right adapters via internal
  action handlers

It is possible to set up Integreat to treat one service as a store/buffer for
other services, and schedule syncs between the store and the other services.

Finally, there will be different interface modules available, that will plug
into the `dispatch()` function and offer other ways of reaching data from the
services – such as out of the box REST or GraphQL APSs.

```
            _________________
           |    Integreat    |
           |                 |
           |        |-> Adapter <-> Service
Action -> Dispatch -|        |
           |        |-> Adapter <-> Service
           |                 |
           |_________________|
```

Data from the services is retrieved, normalized, and mapped by the adapter, and
returned asynchronously back to the code that initiated the action. Actions for
fetching data will be executed right away.

Actions that update data on services will reversely map and serialize the data
before it is sent to a service. These actions may be queued or scheduled, by
setting up Integreat with the supplied queue middleware.

Integreat comes with a [standard data format](#the-data-format), which is the
only format that will be exposed to the code dispatching the actions. The
mapping, normalizing, and serializing will happing to and from this format,
according to the defined schemas and mapping rules.

To deal with security and permissions, Integreat has a built-in concept of an
ident. Other authentication schemes may be mapped to Integreat's ident scheme,
to provide data security from a service to another service or to the dispatched
action. A ground principle is that nothing that enters Integreat from an
authenticated service, will leave Integreat unauthenticated. What this means,
though, depends on how you define your services.

## Install

Requires node v8.6.

Install from npm:

```
npm install integreat
```

## Hello world

The hello world example of Integreat, would look something like this:

```javascript
import Integreat from 'integreat'
import httpTransporter from 'integreat-transporter-http'

const schemas = [
  {
    id: 'message',
    service: 'helloworld',
    shape: { text: 'string' },
  },
]

const services = [
  {
    id: 'helloworld',
    transporter: 'http',
    endpoints: [{ options: { uri: 'https://api.helloworld.io/json' } }],
    mappings: {
      message: { text: 'message' },
    },
  },
]

const transporters = { http: httpTransporter }

const great = Integreat.create({ schemas, services }, { transporters })
await great.listen() // Only needed for transporter listening to incoming requests
const action = { type: 'GET', payload: { type: 'message' } }

great.dispatch(action).then((data) => console.log(data.text))
//--> Hello world

await great.close()
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

## Schema definitions

To do anything with Integreat, you need to define one or more schemas. They
describe the data you expected to get out of Integreat. A type will be
associated with a service, which is used to retrieve data for the type, unless
another service is specified.

```
{
  id: <string>,
  plural: <string>,
  service: <serviceId>,
  attributes: {
    <attrId>: {
      type: <string>,
      default: <object>
    }
  },
  relationships: {
    <relId>: {
      type: <string>,
      default: <object>,
      query: <query params>
    }
  },
  auth: <auth def>
}
```

The convention is to use singular mode for the `id`. The `plural` property is
optional, but it's good practice to set it to the plural mode of the `id`, as
some interfaces may use it. For instance,
[`integreat-api-json`](https://github.com/integreat-io/integreat-api-json) uses
it to build a RESTful endpoint structure, and will append an _s_ to `id` if
`plural` is not set – which may be weird in some cases.

### Attributes

Each attribute is defined with an id, which may contain only alphanumeric
characters, and may not start with a digit. This id is used to reference the
attribute.

The `type` defaults to `string`. Other options are `integer`, `float`,
`boolean`, and `date`. Data from Integreat will be cast to corresponding
JavaScript types.

The `default` value will be used when a data service does not provide this value.
Default is `null`.

### Relationships

Relationship is defined in the same way as attributes, but with one important
difference: The `type` property refers to other Integreat schemas. E.g. a
schema for an article may have a relationship called `author`, with
`type: 'user'`, referring to the schema with id `user`. `type` is required on
relationships.

The `default` property sets a default value for the relationship, in the same
way as for attributes, but note that this value should be a valid id for an item
of the type the relationship refers to.

Finally, relationships have a `query` property, which is used to retrieve items
for this relationship. In many cases, a service may not have data that maps to
id(s) for a relationship directly, and this is the typical use case for this
property.

The `query` property is an object with key/value pairs, where the key is the id
of a field (an attribute, a relationship, or `id`) on the schema the relationship
refers to, and the value is the id of field on this schema.

Example schema with a query definition:

```
{
  id: 'user',
  ...
  relationships: {
    articles: {type: 'article', query: {author: 'id'}}
  }
}
```

In this case, the `articles` relationship on the `user` schema may be fetched by
querying for all items of type `article`, where the `author` field equals the
`id` of the `user` item in question.

### Authorization

Set the `access` property to enforce permission checking on the schema. This
applies to any service that provides this schema.

The simplest access type `auth`, which means that anyone can do anything with
the data of this schema, as long as they are authenticated.

Example of a schema with an access rule:

```javascript
{
  id: 'entry',
  attributes: {...},
  relationships: {...},
  access: 'auth'
}
```

To signal that the schema really has no need for authorization, use `all`.
This is not the same as not setting the `auth` prop, as `all` will override
Integreat's principle of not letting authorized data out of Integreat without
an authorization rule. In a way, you can say that `all` is an authorization
rule, but it allows anybody to access the data, even the unauthenticated.

The last of the simpler access types, is `none`, which will simly give no one
access, no matter who they are.

For a more fine-grained rules, set `access` to an access definition.

## Service definitions

Service definitions are at the core of Integreat, as they define the services to
fetch data from, how to map this data to a set of items to make available
through Integreat's data api, and how to send data back to the service.

A service definition object defines the adapter, any authentication method, the
endpoints for fetching from and sending to the service, and mappings to the
supported schemas (attributes and relationships):

```
{
  id: <string>,
  adapter: <string>,
  auth: <auth id>,
  meta: <type id>,
  options: {...},
  endpoints: [
    <endpoint definition>,
    ...
  ],
  mappings: {
    <schema id>: <mapping definition | mapping id>,
    ...
  }
}
```

Service definitions are passed to Integreat on creation through the
`Integreat.create()` function. There is no way to change services after
creation.

See [mapping definition](#mapping-definition) for a description of the
relationship between services and mappings, and the `mappings` property.

The `auth` property should normally be set to the id of an
[auth definition](#service-authentication) if the service requires authentication.
In cases where the service is authenticated by other means, e.g. by including
username and password in the uri, set the `auth` property to `true` to signal
that this is an authenticated service.

### Endpoint definition

```
{
  id: <string>,
  match: {
    type: <string>,
    scope: <'collection'|'member'>,
    action: <action type>,
    params: {...},
    filters: []
  },
  validate: [],
  mutation: <mutation pipeline>,
  sendNoDefaults: <boolean>,
  returnNoDefaults: <boolean>,
  mappings: {
    <schema id>: <mapping definition | mapping id>,
  },
  options: {...}
}
```

#### Match properties

An endpoint may specify none or more of the following match properties:

- `id`: An action payload may include an `endpoint` property, that will be
  matched against this `id`. For actions with an endpoint id, no other matching
  properties will be considered
- `type`: When set, the endpoint will only be used for actions with the
  specified schema type (not to be confused with the action type)
- `scope`: May be `member` or `collection`, to specify that the endpoint should
  be used to request one item (member) or an entire collection of items.
  Setting this to `member` will require an `id` property in the action payload.
  Not setting this property signals an endpoint that will work for both
- `action`: May be set to the type string of an action. The endpoint will match
  only actions of this type

Endpoints are matched to an action by picking the matching endpoint with highest
level of specificity. E.g., for a GET action asking for resources of type
`entry`, an endpoint with `action: 'GET'` and `type: 'entry'` is picked over an
endpoint matching all GET actions.

Properties are matched in the order they are listed above, so that when two
endpoints matches – e.g. one with a scope and the other with an action, the one
matching with scope is picked. When two endpoints are equally specified with the
same match properties specified, the first one is used.

All match properties except `id` may be specified with an array of matching
values, so that an endpoint may match more cases. However, when two endpoints
match on a property specified as an array on one and as a single value on the
other, the one with the single value is picked.

When no match properties are set, the endpoint will match any actions, as long
as no other endpoints match.

#### Params property

An endpoint may accept properties, and indicate this by listing them on the
`params` object, with the value set to `true` for required params. All
properties are treated as strings.

An endpoint is only used for actions where all the required parameters are
present.

Example service definition with endpoint parameters:

```
{
  id: 'entries',
  adapter: 'json',
  endpoints: [
    {
      params: {
        author: true,
        archive: false
      },
      options: {
        uri: 'https://example.api.com/1.0/{author}/{type}_log{?archive}'
      }
    }
  ],
  ...
}
```

Some params are always available and does not need to be specified in `params`,
unless to define them as required:

- `id`: The item id from the action payload or from the data property (if it is
  an object and not an array). Required in endpoints with `scope: 'member'`, not
  included for `scope: 'collection'`, and optional when scope is not set.
- `type`: The item type from the action payload or from the data property (if it
  is an object and not an array).
- `typePlural`: The plural form of the type, gotten from the corresponding
  schema's `plural` prop – or by adding an 's' to the type is `plural` is not
  set.

#### Options property

Unlike the match properties, the `options` property is required. This should be
an object with properties to be passed to the adapter as part of a request. The
props are completely adapter specific, so that each adapter can dictate what
kind of information it will need, but there are a set of recommended props to
use when they are relevant:

- `uri`: A uri template, where e.g. `{id}` will be placed with the value of the
  parameter `id` from the action payload. For a full specification of the template
  format, see
  [Integreat URI Template](https://github.com/integreat-io/great-uri-template).

- `path`: A [path](#paths) into the data, specific for this endpoint. It will
  usually point to an array, in which the items can be found, but as mappings may
  have their own `path`, the endpoint path may point to an object from where the
  different mapping paths point to different arrays.

- `method`: An adapter specific keyword, to tell the adapter which method of
  transportation to use. For adapters based on http, the options will typically
  be `PUT`, `POST`, etc. The method specified on the endpoint will override any
  method provided elsewhere. As an example, the `SET` action will use the `PUT`
  method as default, but only if no method is specified on the endpoint.

## Mapping definition

```
{
  id: <string>,
  type: <typeId>,
  path: <string>,
  attributes: {
    <attrKey>: {
      path: <string>,
      transform: <transform pipeline>
    }
  },
  relationships: {
    <relKey>: {
      path: <string>,
      transform: <transform pipeline>
    }
  },
  toService: {
    path: <string>,
    transform: <transform pipeline>
  }
  qualifier: <string>,
  transform: <transform pipeline>,
  filterFrom: <filter pipeline>,
  filterTo: <filter pipeline>
}
```

`id`, `createdAt`, or `updatedAt` should be defined as attributes on
the `attributes` property, but will be moved to the item on mapping. If any of
these are not defined, default values will be used; a UUID for `id` and the
current timestamp for `createdAt` and `updatedAt`.

Data from the service may come in a different format than what is
[required by Integreat](<(#the-data-format)>), so specify a [`path`](#paths) to
point to the right value for each attribute and relationship. These values will
be cast to the right schema after all mapping, mutating, and transforming is
done. The value of each attribute or relationship should be in a format that can
be coerced to the type defined in the schema. The `transform` pipeline may be
used to accomplish this, but it is sufficient to return something that can be
cast to the right type. E.g. returning `'3'` for an integer is okay, as
Integreat will cast it with `parseInt()`.

The `param` property is an alternative to specifying a `path`, and refers to a
param passed to the `retreive` method. Instead of retrieving a value from the
service data, an attribute or relationship with `param` will get its value from
the corresponding parameter. When sending data _to_ a service, this
attribute/relationship will be disregarded.

Most of the time, your `attributes` and `relationships` definitions will only
have the `path` property, so providing the `path` string instead of an object
is a useful shorthand for this. I.e. `{title: 'article.headline'}` translates to
`{title: {path: 'article.headline'}}`.

The `toService` section behaves just like `attributes` and `relationships`,
except that it is only used when mapping _to_ a service. This is where you'll
put mappings that don't have a corresponding field in the schema you map
to/from, e.g. root paths like `^params.service`.

Mappings relate to both services and schemas, as the thing that binds them
together, but it is the service definition that "owns" them. The `mappings`
object on a service definition contains the ids of all relevant schemas as keys,
and the value for these keys are either a mapping definition object or a mapping
id. The `type` property of a mapping definition is optional when defined
directly in a service definition, but should match the key if it is set.

In some cases you may be able to reuse a mapping for several services or several
types, by referring to the mapping id from several service definitions.

### Paths

Mappings, attributes, and relationships all have an optional `path` property,
for specifying what part of the data from the service to return in each case.
(Endpoints may also have a `path` property, but not all adapters support this.)

The `path` properties use a dot notation with array brackets.

For example, with this data returned from the service ...

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

The bracket notation also offers two options for objects:

- `[keys]` - Matches all keys on an object
- `[values]` - Matches all values for the object's keys

When mapping data _to_ the service, the paths are used to reconstruct the data
format the service expects. Only properties included in the paths will be
created, so any additional properties must be set by a transform function or the
adapter.

Arrays are reconstructed with any object or value at the first index, unless a
single, non-negative index is specified in the path.

Prefix a path with `^` to map with values from the mapping object, e.g.
`^params.service`.

You may optionally supply alternative paths by providing an array of paths. If
the first one does not match any properties in the data, the next path is tried,
and so on.

### Qualifiers

When a service returns data for several schemas, Integreat needs a way to
recognize which schema to use for each item in the data. For some services,
the different schemas may be find on different paths in the data, so
specifying different paths on each mapping is sufficient. But when all items
are returned in one array, for instance, you need to specify qualifiers for
the mappings.

A qualifier is simply a path with an expression that will evaluate to true or
false. If a mapping has qualifiers, it will only be applied to data that
satisfies all its qualifiers. Qualifiers are applied to the data at the
mapping's path, before it is mapped and transformed.

An example of two mappings with qualifiers:

```
...
mappings: {
  entry: {
    attributes: {...},
    qualifier: 'type="entry"'
  },
  admin: {
    attributes: {...},
    qualifier: [
      'type="account"',
      'permissions.roles[]="admin"'
    ]
  }
}
```

When a qualifier points to an array, the qualifier returns true when at least
one of the items in the array satisfies the condition.

### Configuring metadata

If a service may send and receive metadata, set the `meta` property to the id of
a schema defining the metadata as attributes.

```
{
  id: 'meta',
  service: <id of service handling the metadata>,
  attributes: {
    <metadataKey>: {
      type: <string>
    }
  }
}
```

The `service` property on the type defines the service that holds metadata for
this type. In some cases the service you're defining metadata for and the service
handling these metadata will be the same, but it is possible to let a service
handle other services' metadata. If you're getting data from a read-only service,
but need to, for instance, set the `lastSyncedAt` metadata for this store,
you'll set up a service as a store for this (the store may also hold other types
of data). Then the read-only store will be defined with `meta='meta'`, and the
`meta` schema will have `service='store'`.

It will usually make no sense to specify default values for metadata.

As with other data received and sent to services, make sure to include endpoints
for the service that will hold the metadata, matching the `GET_META` and
`SET_META` actions, or the schema defining the metadata. The way you set up
these endpoints will depend on your service.

Also define a [mapping](#mapping-definition) between this schema and the
service. You may leave out `attributes` and `relationships` definitions and the
service will receive the metadata in Integreat's standard format:

```
{
  id: <serviceId>,
  type: <meta type>,
  createdAt: <date>,
  updatedAt: <date>,
  attributes: {
    <key>: <value>
  }
}
```

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
configuration. This means that mapped value from services may be used as ident
ids, but be careful to set this up right.

`tokens` are other values that may identify this ident. E.g., an api that uses
Twitter OAuth to identify it's users, may provide the `'twitter|23456'` token in
the example above, which will be replaced with this ident when it enters
Integreat.

`roles` are an example of how idents are given permissions. The roles are
custom defined per setup, and may be mapped to roles from other systems. When
setting the auth rules for a service, roles may be used to require that
the request to get data of this schema, an ident with the role `admin` must
be provided.

Idents may be supplied with an action on the `meta.ident` property. It's up to
the code dispatching an action to get hold of the properties of an ident in a
secure way. Once Integreat receives an ident, it will assume this is accurate
information and uphold its part of the security agreement and only return data
and execute actions that the ident have permissions for.

### Access rules

Access rules are defined with properties telling Integreat which rights to
require when performing different actions with a given schema. It may be set
as a overall right to do anything with a schema, or it may be specified on the
different action types available: GET, SET, and DELETE, including actions that
start with these verbs.

Note that this applies to the actual actions being sent to a service – some
actions will never reach a service, but will trigger other actions, and access
will be granted or refused to each of these actions as they reach the service
interface, but not to the triggering action.

An access definition for letting all authorized idents to GET, but requiring
the role `admin` for SETs:

```javascript
{
  id: 'access1',
  actions: {
    GET: {allow: 'auth'},
    SET: {role: 'admin'}
  }
}
```

To use these access rules, set the definition object directly on the `access`
property, of an schema, or set `access: 'access1'` on the relevant schema(s).
The `id` is only needed in the latter case.

**Note:** Referring to access rules by id is not implemented yet.

For rules that treat every action the same, set the props on the access object
directly. This will also define a default for actions not defined specifically.

In the example above, no one will be allowed to DELETE. A better way to
achieve what we aimed for above, could be:

```javascript
{
  id: 'access2',
  role: 'admin',
  actions: {
    GET: {allow: 'auth'}
  }
}
```

In this example, all actions are allowed for admins, but anyone else that is
authenticated may GET.

Available rule props:

- `role` - Authorize only idents with this role. May be an array of strings
  (array is not implemented).
- `ident` - Authorize only idents with this precise id. May be an array (array
  is not implemented).
- `roleFromField` - Specify the field name (attribute or relationship) on
  the schema, that will hold the role value. When authorizing a data item with
  an ident, the field value on the item must match a role on the ident.
- `identFromField` - The same as `roleFromField`, but for an ident id.
- `allow` - Set to `all`, `auth`, or `none`, to give access to everybody, only
  the authenticated, or no one at all. This is also available in short form –
  use this string instead of a access rule object.

Another example, intended for authorizing only the ident matching an account:

```javascript
{
  id: 'accountAccess',
  identFromField: 'id'
}
```

When used with e.g. an `account` schema, given that the id of the account is
used as ident id, only an ident with the same id as the account, will have
access to it.

### Persisting idents

A security scheme with no way of storing the permissions given to each ident,
is of little value. (The only case where this would suffice, is when every
relevant service provided the same ident id, and authorization where done on the
ident id only.)

Unsurprisingly, Integreat uses schemas and services to store idents. In the
definition object passed to `Integreat.create()`, set the id of the schema to
use with idents, on `ident.schema`.

In addition, you may define what fields (attributes or relationships) will
match the different props on an ident:

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
doesn't hurt to specify it anyway – for clarity. The service still have the
final word, as any field that is not defined on the schema, will not survive
casting.

Note that in the example above, the `id` of the data will be used as the ident
`id`. When the id is not suited for this, you will need another field on the
schema that may act as the ident id. In cases where you need to transform the
id from the data in some way, this must be set up as a separate field and the
mapping definition will dictate how to transform it. In most cases, the `id`
will do, though.

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
    params: {tokens: 'twitter|23456'}
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
  meta: <meta properties>
}
```

`type` is one [of the action types](#available-actions) that comes with
Integreat and `payload` are data for this action.

The `meta` object is for properties that does not belong in the payload. You may
add your own properties here, but be aware that some properties are already
used by Integreat, and more may be added in the future.

Current meta properties reserved by Integreat:

- `id`: Assigning the action an id. Will be picked up when queueing.
- `queue`: Signals that an action may be queued. May be `true` or a timestamp
- `queuedAt`: Timestamp for when the action was pushed to the queue
- `schedule`: A [schedule definition](#schedule-definition)
- `ident`: The ident to authorize the action with

### Returned responses from actions

Retrieving from a service will return an Intgreat response object of the
following format:

```
{
  status: <statusCode>,
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
usually be mapped data in [Integreat's data format](#the-data-format), but
essentially, the data format depends on which action it comes from.

When the status is `queued`, the id of the queued action may found in
`response.data.id`. This is the id assigned by the queue, but it is expected
that queues will use `action.meta.id` when present.

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
  type: <schema>,
  createdAt: <date>,
  updatedAt: <date>,
  attributes: {
    <attrKey>: <value>,
    ...
  },
  relationships: {
    <relKey>: {id: <string>, type: <schema>},
    <relKey: [{id: <string>, type: <schema>, ...],
    ...
  }
}
```

`id`, `type`, `createdAt`, and `updatedAt` are mandatory and created by
Integreat even when there are no mappings to these fields. In the future,
`createdAt` and `updatedAt` may become properties of `attributes`, but will
still be treated in the same way as now.

### Available actions

#### `GET`

Get items from a service. Returned in the `data` property is an array of mapped
object, in [Integreat's data format](#the-data-format).

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

By default, the returned data will be cast with default values, but set
`returnNoDefaults: true` on the action payload to get only values mapped from
the service data.

#### `GET_UNMAPPED`

Get data from a service without applying the mapping rules. Returned in the
`data` property is an array of normalized objects in the format retrieved from
the service. The data is not mapped in any way, and the only thing guarantied, is
that this is a JavaScript object.

This action does not require a `type`, unlike the `GET` action, as it won't
lookup mappings for any given type. The only reason to include a `type` in the
payload, would be if the endpoint uri requires a `type` parameter.

Furthermore, a `service` property is required, as there is no `type` to infer
from.

Example GET action:

```javascript
{
  type: 'GET_UNMAPPED',
  payload: {
    service: 'store',
    endpoint: 'get'
  }
}
```

The endpoint will be picked according to the matching properties, unless an
endpoint id is supplied as an `endpoint` property of `payload`.

#### `GET_META`

Get metadata for a service. Normal endpoint matching is applied, but it's
common practice to define an endpoint matching the `GET_META` action.

The action returns an object with a `data` property, which contains the `service`
(the service id) and `meta` object with the metadata set as properties.

Example GET_META action:

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

Send data to a service. Returned in the `data` property is the data that was sent
to the service – casted, but not mapped to the service.

The data to send is provided in the payload `data` property, and must given as
an array of objects in [Integreat's data format](#the-data-format).

Example SET action:

```javascript
{
  type: 'SET',
  payload: {
    service: 'store',
    data: [
      {id: 'ent1', type: 'entry'},
      {id: 'ent5', type: 'entry'}
    ]
  }
}
```

In the example above, the `service` is specified in the payload. Specifying a
`type` to infer the service from is also possible, but not recommended, as it
may be removed in future versions of Integreat.

The endpoint will be picked according to the matching properties, unless an
endpoint id is supplied as an `endpoint` property of `payload`.

To send only fields mapped from the action data to the service, set
`sendNoDefaults: true` on the endpoint config to cast the data going to the
service without using default values. This will not affect the data coming back
from the action, but set `returnNoDefaults: true` to leave defaults out of the
response data.

#### `SET_META`

Set metadata on a service. Returned in the `data` property is whatever the
adapter returns. Normal endpoint matching is used, but it's common practice to
set up an endpoint matching the `SET_META` action.

The payload should contain the `service` to get metadata for (the service id), and
a `meta` object, with all metadata to set as properties.

Example SET_META action:

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
and must given as an array of objects in
[Integreat's data format](#the-data-format), but note that the attributes and
relationships are not required.

Example DELETE action:

```javascript
{
  type: 'DELETE',
  payload: {
    service: 'store',
    data: [
      {id: 'ent1', type: 'entry'},
      {id: 'ent5', type: 'entry'}
    ]
  }
}
```

In the example above, the `service` is specified in the payload. Specifying a
`type` to infer the service from is also possible.

Example DELETE action for one item:

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
endpoint id is supplied as an `endpoint` property of `payload`.

The method used for the request defaults to `POST` when `data` is set, and
`DELETE` for the `id` and `type` option, but may be overridden on the endpoint.

`DEL` is a shorthand for `DELETE`.

#### `SYNC`

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
    endpoint: 'getExpired',
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
  uri: '/_design/fns/_view/expired?include_docs=true{&endkey=timestamp}',
  path: 'rows[].doc'
}
```

### Custom actions

You may write your own action handlers to handle dispatched actions just like
the built-in types.

Action handler signature:

```javascript
function (payload, {dispatch, services, schemas, getService}) { ... }
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
const great = Integreat.create(defs, {schemas, services, mappings, actions})
```

Note that if a custom action handler is added with an action type that is
already use by one of Integreat's built-in action handlers, the custom handler
will have precedence. So be careful when you choose an action type, if your
intention is not to replace an existing action handler.

## Adapters

Interface:

- `prepareEndpoint(endpointOptions, [serviceOptions])`
- `async send(request)`
- `async normalize(data, request)`
- `async serialize(data, request)`

Available adapters:

- `json` (built in)
- [`couchdb`](https://github.com/integreat-io/integreat-adapter-couchdb)

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

## Pipeline functions

- Item `transform(item)`
- Item `filter(item)`
- Attribute `transform(value)`

Built in transformers:

- `not` - inverts a boolean value going from or to a service
- `hash` - converts any string(ish) value to a SHA256 hash in base64 (with the
  url-unfriendly characters +, /, and = replaced with -, \_, and ~)

### Schedule definition

**Note:** This will likely be removed in version 0.8.

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

## Queue

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
