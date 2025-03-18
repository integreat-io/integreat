import type {
  TransformDefinition,
  TransformObject,
  Pipeline,
} from 'map-transform/types.js'
import { Action, Condition, ValidateObject } from '../types.js'

export interface JobBase {
  conditions?: Record<string, Condition | undefined>
  preconditions?: ValidateObject[]
  premutation?: TransformObject | Pipeline
  mutation?: TransformObject | Pipeline
  iterate?: TransformDefinition
  iteratePath?: string
  iterateConcurrency?: number
  postmutation?: TransformObject | Pipeline
  postconditions?: ValidateObject[]
  responseMutation?: TransformObject | Pipeline
}

export interface JobStepDef extends JobBase {
  id: string
  action: Action
}

export interface JobDef extends JobBase {
  id?: string
  action?: Action
  flow?: (JobStepDef | JobStepDef[])[]
  cron?: string
  tz?: string
}

export interface JobDefWithFlow extends JobDef {
  flow: NonNullable<JobDef['flow']>
}
