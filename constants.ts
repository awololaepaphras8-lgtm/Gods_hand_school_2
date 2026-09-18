
import { FeeStructure, GradeLevel } from './types';

export const INITIAL_FEES: FeeStructure = {
  'Crèche': 22000,
  'crèche': 22000,
  'Prenursery 1': 23000,
  'prenursery 1': 23000,
  'Pre-Nursery 1': 23000,
  'Prenursery 2': 25000,
  'prenursery 2': 25000,
  'Pre-Nursery 2': 25000,
  'Nursery 1': 26000,
  'nursery 1': 26000,
  'Nursery 2': 28000,
  'nursery 2': 28000,
  'Basic 1': 30000,
  'basic 1': 30000,
  'Basic 2': 32000,
  'basic 2': 32000,
  'Basic 3': 34000,
  'basic 3': 34000,
  'Basic 4': 34000,
  'basic 4': 34000,
  'Basic 5': 53000,
  'basic 5': 53000,
  'JSS 1': 50000,
  'JSS1': 50000,
  'jss1': 50000,
  'JSS 2': 52000,
  'JSS2': 52000,
  'jss2': 52000,
  'JSS 3': 52000,
  'JSS3': 52000,
  'jss3': 52000,
  'SS 1 (Science)': 60000,
  'SS1 (Science)': 60000,
  'ss1 (science)': 60000,
  'SS 1 (Commerce and Arts)': 57000,
  'SS 1 (Commerce & Arts)': 57000,
  'SS1 (Commerce and Arts)': 57000,
  'ss1 (commerce and arts)': 57000,
  'SS 2 (Science)': 65000,
  'SS2 (Science)': 65000,
  'ss2(science)': 65000,
  'SS 2 (Commerce and Arts)': 60000,
  'SS 2 (Commerce & Arts)': 60000,
  'SS2 (Commerce and Arts)': 60000,
  'ss2(commerce and arts)': 60000,
  'SS 3 (Science)': 67000,
  'SS3 (Science)': 67000,
  'ss3(science)': 67000,
  'SS 3 (Commerce and Arts)': 62000,
  'SS 3 (Commerce & Arts)': 62000,
  'SS3 (Commerce and Arts)': 62000,
  'ss3(commerce and arts)': 62000,
  // Backward compatibility mappings
  'KG 1': 22000,
  'KG 2': 23000,
  'Primary 1': 30000,
  'Primary 2': 32000,
  'Primary 3': 34000,
  'Primary 4': 34000,
  'Primary 5': 53000,
  'SSS 1': 60000,
  'SSS 2': 65000,
  'SSS 3': 67000,
};

export const GRADE_GROUPS = [
  { name: 'Crèche & Prenursery', levels: ['Crèche', 'Prenursery 1', 'Prenursery 2'] },
  { name: 'Nursery', levels: ['Nursery 1', 'Nursery 2'] },
  { name: 'Basic (Primary)', levels: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5'] },
  { name: 'Junior Secondary', levels: ['JSS 1', 'JSS 2', 'JSS 3'] },
  { 
    name: 'Senior Secondary', 
    levels: [
      'SS 1 (Science)', 'SS 1 (Commerce and Arts)',
      'SS 2 (Science)', 'SS 2 (Commerce and Arts)',
      'SS 3 (Science)', 'SS 3 (Commerce and Arts)'
    ] 
  },
];

export const GRADE_ORDER: GradeLevel[] = [
  'Crèche',
  'Prenursery 1',
  'Prenursery 2',
  'Nursery 1',
  'Nursery 2',
  'Basic 1',
  'Basic 2',
  'Basic 3',
  'Basic 4',
  'Basic 5',
  'JSS 1',
  'JSS 2',
  'JSS 3',
  'SS 1 (Science)',
  'SS 1 (Commerce and Arts)',
  'SS 2 (Science)',
  'SS 2 (Commerce and Arts)',
  'SS 3 (Science)',
  'SS 3 (Commerce and Arts)'
];

export const APP_STORAGE_KEY = 'gods_hand_school_v1';

export const getNextGradeLevel = (currentGrade: string): string | null => {
  if (!currentGrade) return null;
  const normalized = currentGrade.trim();
  
  // Direct match in GRADE_ORDER
  const idx = GRADE_ORDER.indexOf(normalized as GradeLevel);
  if (idx !== -1) {
    if (idx < GRADE_ORDER.length - 1) {
      return GRADE_ORDER[idx + 1];
    }
    return null; // Final class
  }

  // Alias & backward compatibility checks
  if (normalized === 'Primary 1') return 'Primary 2';
  if (normalized === 'Primary 2') return 'Primary 3';
  if (normalized === 'Primary 3') return 'Primary 4';
  if (normalized === 'Primary 4') return 'Primary 5';
  if (normalized === 'Primary 5') return 'JSS 1';
  if (normalized === 'KG 1') return 'KG 2';
  if (normalized === 'KG 2') return 'Primary 1';
  if (normalized === 'Pre-Nursery 1') return 'Pre-Nursery 2';
  if (normalized === 'Pre-Nursery 2') return 'Nursery 1';
  if (normalized === 'SSS 1') return 'SSS 2';
  if (normalized === 'SSS 2') return 'SSS 3';

  return null;
};
