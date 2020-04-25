import { MapDefinition, CustomFunction, Dictionaries } from 'map-transform'
import { Schema } from '../schema'
import { Dictionary } from '../types'
import { MappingDef } from '../service/types'

const pipelinesFromMappings = (
  mappings: MappingDef[] = []
): Dictionary<MapDefinition> =>
  mappings.reduce(
    (pipelines, def) => ({
      ...pipelines,
      [def.id]: def.mapping,
    }),
    {}
  )

const pipelinesFromSchemas = (
  schemas: Dictionary<Schema>
): Dictionary<MapDefinition> =>
  Object.entries(schemas).reduce(
    (pipelines, [id, def]) => ({ ...pipelines, [`cast_${id}`]: def.mapping }),
    {}
  )

export default function createMapOptions(
  schemas: Dictionary<Schema>,
  mappings?: MappingDef[],
  functions?: Dictionary<CustomFunction>,
  dictionaries?: Dictionaries
) {
  return {
    pipelines: {
      ...pipelinesFromMappings(mappings),
      ...pipelinesFromSchemas(schemas),
    },
    functions,
    dictionaries,
  }
}
