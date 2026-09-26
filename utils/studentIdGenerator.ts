import { StudentAccount } from '../types';

/**
 * Grade to sequential class number mapping:
 * crech = 1, pre-nursery = 2, then ascend till ss3 (class 15)
 */
export const getClassNumber = (grade: string): number => {
  if (!grade) return 1;
  const g = grade.trim().toLowerCase();

  // 1: Creche
  if (g.includes('crèche') || g.includes('creche')) return 1;

  // 2: Pre-Nursery / Prenursery
  if (g.includes('pre-nursery') || g.includes('prenursery') || g.includes('kg 1')) return 2;

  // 3: Nursery 1 / KG 2
  if (g.includes('nursery 1') || g.includes('kg 2')) return 3;

  // 4: Nursery 2
  if (g.includes('nursery 2')) return 4;

  // 5: Basic 1 / Primary 1
  if (g.includes('basic 1') || g.includes('primary 1') || g === '1') return 5;

  // 6: Basic 2 / Primary 2
  if (g.includes('basic 2') || g.includes('primary 2') || g === '2') return 6;

  // 7: Basic 3 / Primary 3
  if (g.includes('basic 3') || g.includes('primary 3') || g === '3') return 7;

  // 8: Basic 4 / Primary 4
  if (g.includes('basic 4') || g.includes('primary 4') || g === '4') return 8;

  // 9: Basic 5 / Primary 5
  if (g.includes('basic 5') || g.includes('primary 5') || g === '5') return 9;

  // 10: JSS 1
  if (g.includes('jss 1') || g.includes('jss1')) return 10;

  // 11: JSS 2
  if (g.includes('jss 2') || g.includes('jss2')) return 11;

  // 12: JSS 3
  if (g.includes('jss 3') || g.includes('jss3')) return 12;

  // 13: SS 1
  if (g.includes('ss 1') || g.includes('ss1') || g.includes('sss 1') || g.includes('sss1')) return 13;

  // 14: SS 2
  if (g.includes('ss 2') || g.includes('ss2') || g.includes('sss 2') || g.includes('sss2')) return 14;

  // 15: SS 3
  if (g.includes('ss 3') || g.includes('ss3') || g.includes('sss 3') || g.includes('sss3')) return 15;

  // Fallback to class 1
  return 1;
};

/**
 * Generates official Student ID in mandated format:
 * "GHS admission year class(crech = 1 pre-nursery = 2 then ascend till ss3) then number starting from 001"
 * e.g. GHS20261001 (Creche in 2026, 1st student)
 *      GHS20268001 (Primary 4 in 2026, 1st student)
 *      GHS202611001 (JSS 2 in 2026, 1st student)
 */
export const generateStudentId = (
  grade: string,
  admissionYear?: number | string,
  existingStudents: StudentAccount[] = []
): string => {
  const currentYear = new Date().getFullYear();
  const year = admissionYear ? Number(admissionYear) : currentYear;
  const classNum = getClassNumber(grade);
  const prefix = `GHS${year}${classNum}`;

  // Find all existing students matching this prefix
  const matchingNumbers: number[] = [];
  existingStudents.forEach(s => {
    if (s.id && s.id.startsWith(prefix)) {
      const rest = s.id.substring(prefix.length);
      const num = parseInt(rest, 10);
      if (!isNaN(num)) {
        matchingNumbers.push(num);
      }
    }
  });

  // Start sequence at 1 (001)
  let nextSeq = 1;
  while (matchingNumbers.includes(nextSeq)) {
    nextSeq++;
  }

  const paddedSeq = String(nextSeq).padStart(3, '0');
  return `${prefix}${paddedSeq}`;
};
