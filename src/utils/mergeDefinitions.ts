import { isObject } from './is.js'
import type { Definitions, DefinitionFlags } from '../types.js'

const arrOrEmptyArr = <T>(arr?: T[]): T[] => (Array.isArray(arr) ? arr : [])

const mergeArrays = <T>(arr1?: T[], arr2?: T[]): T[] => [
  ...arrOrEmptyArr(arr1),
  ...arrOrEmptyArr(arr2),
]

const isFlagSet = (flags: DefinitionFlags, flag?: keyof DefinitionFlags) =>
  Boolean(flag && flags[flag]) // eslint-disable-line security/detect-object-injection

const resolveFlagAlias = (key: string) =>
  key === 'breakByDefault' ? 'failOnErrorInPostconditions' : key

const mergeFlags = (defs: DefinitionFlags, def?: DefinitionFlags) =>
  def
    ? {
        ...defs,
        ...Object.fromEntries(
          Object.entries(def)
            .map(([key, value]) => [resolveFlagAlias(key), value])
            .filter(
              ([key, value]) =>
                value === true ||
                !isFlagSet(defs, key as keyof DefinitionFlags), // Only set the flag if the flag is true or if it doesn't exist yet
            ),
        ),
      }
    : defs

const mergeDefs = (
  defs: Definitions,
  def: Partial<Definitions>,
): Definitions => ({
  ...defs,
  id: def.id || defs.id,
  auths: mergeArrays(defs.auths, def.auths),
  schemas: mergeArrays(defs.schemas, def.schemas),
  services: mergeArrays(defs.services, def.services),
  mutations: { ...defs.mutations, ...def.mutations },
  dictionaries: { ...defs.dictionaries, ...def.dictionaries },
  jobs: mergeArrays(defs.jobs, def.jobs),
  identConfig: def.identConfig || defs.identConfig,
  queueService: def.queueService || defs.queueService,
  flags: mergeFlags(defs.flags || {}, def.flags),
})

export default function mergeDefinitions(
  ...defs: Partial<Definitions>[]
): Definitions {
  return defs.filter(isObject).reduce<Definitions>(mergeDefs, {
    id: undefined,
    auths: [],
    schemas: [],
    services: [],
    mutations: {},
    dictionaries: {},
    jobs: [],
    identConfig: undefined,
    queueService: undefined,
    flags: {},
  })
}
