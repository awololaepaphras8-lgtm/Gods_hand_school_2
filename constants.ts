
import { FeeStructure, GradeLevel } from './types';

export const INITIAL_FEES: FeeStructure = {
  'KG 1': 25000,
  'KG 2': 25000,
  'Nursery 1': 30000,
  'Nursery 2': 30000,
  'Primary 1': 45000,
  'Primary 2': 45000,
  'Primary 3': 45000,
  'Primary 4': 45000,
  'Primary 5': 45000,
  'JSS 1': 60000,
  'JSS 2': 60000,
  'JSS 3': 65000,
  'SSS 1': 75000,
  'SSS 2': 75000,
  'SSS 3': 85000,
};

export const GRADE_GROUPS = [
  { name: 'Kindergarten', levels: ['KG 1', 'KG 2'] },
  { name: 'Nursery', levels: ['Nursery 1', 'Nursery 2'] },
  { name: 'Primary', levels: ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'] },
  { name: 'Junior Secondary', levels: ['JSS 1', 'JSS 2', 'JSS 3'] },
  { name: 'Senior Secondary', levels: ['SSS 1', 'SSS 2', 'SSS 3'] },
];

export const GRADE_ORDER: GradeLevel[] = [
  'KG 1', 'KG 2',
  'Nursery 1', 'Nursery 2',
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5',
  'JSS 1', 'JSS 2', 'JSS 3',
  'SSS 1', 'SSS 2', 'SSS 3'
];

export const APP_STORAGE_KEY = 'gods_hand_school_v1';
