import { MapDefinition, Transformer, Dictionaries } from 'map-transform'
import { Schema } from '../schema/index.js'
import { MapOptions } from '../service/types.js'

const pipelinesFromSchemas = (
  schemas: Record<string, Schema>
): Record<string, MapDefinition> =>
  Object.entries(schemas).reduce(
    (pipelines, [id, def]) => ({ ...pipelines, [`cast_${id}`]: def.mapping }),
    {}
  )

export default function createMapOptions(
  schemas: Record<string, Schema>,
  mutations?: Record<string, MapDefinition>,
  transformers?: Record<string, Transformer>,
  dictionaries?: Dictionaries
): MapOptions {
  return {
    pipelines: {
      ...mutations,
      ...pipelinesFromSchemas(schemas),
    },
    transformers,
    dictionaries,
    fwdAlias: 'from',
    revAlias: 'to',
    noneValues: [undefined, null, ''],
  }
}
