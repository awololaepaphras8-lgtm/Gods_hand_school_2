import { Course, GradeLevel, TeacherAssignmentRole } from '../types';

/**
 * Normalizes a course or subject title so that redundant class suffixes
 * (e.g. "for JSS 1", "for SS 2", " - JSS 1", "(JSS 1)") are stripped away cleanly.
 * Ensures "Mathematics for JSS 1" and "Mathematics for SS 2" become simply "Mathematics".
 */
export function normalizeCourseName(rawName: string): string {
  if (!rawName) return '';
  let name = rawName.trim();

  // Pattern 1: Suffix with "for/in/to <grade>" e.g. "Mathematics for JSS 1", "English for Primary 5"
  name = name.replace(/\s+(?:for|in|to)\s+(?:cr[èe]che|prenursery|pre-nursery|nursery|basic|primary|jss|sss|ss|kg)\s*\d*[^)]*$/i, '');

  // Pattern 2: Parentheses suffix e.g. "Mathematics (JSS 1)", "Civic Education (SS2)"
  name = name.replace(/\s*\(\s*(?:cr[èe]che|prenursery|pre-nursery|nursery|basic|primary|jss|sss|ss|kg)[^)]*\)$/i, '');

  // Pattern 3: Dash / hyphen suffix e.g. "Mathematics - JSS 1", "Basic Science - Primary 4"
  name = name.replace(/\s*[-–—]\s*(?:cr[èe]che|prenursery|pre-nursery|nursery|basic|primary|jss|sss|ss|kg).*$/i, '');

  // Pattern 4: Bare grade suffix e.g. "Mathematics JSS1", "English SSS 2"
  name = name.replace(/\s+(?:cr[èe]che|prenursery|pre-nursery|nursery|basic|primary|jss|sss|ss|kg)\s*\d+$/i, '');

  // Clean trailing punctuation and spaces
  name = name.replace(/[-–—,:;()]+$/, '').trim();

  // Return formatted name; preserve proper casing if already title-cased, otherwise clean up
  if (name.length > 0) {
    // Standardize leading letter of each word to uppercase
    return name
      .split(/\s+/)
      .map(word => {
        // preserve uppercase acronyms like ICT, CRS, IRS, PHE
        if (/^[A-Z]{2,5}$/.test(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  return rawName.trim();
}

export interface DistinctStaffCourse {
  id: string;
  name: string;
  description: string;
  grades: GradeLevel[];
  primaryGrade: GradeLevel;
  originalCourse: Course;
}

/**
 * Filters and deduplicates school courses for a specific staff member.
 * 1. Strictly restricts courses to those assigned to the staff member's class(es) or subjects.
 * 2. Deduplicates by normalized course title: e.g. Mathematics is listed ONCE, never repeating
 *    "Mathematics for JSS 1" and "Mathematics for SS 2".
 */
export function getStaffAssignedCourses(
  allCourses: Course[] = [],
  teacher: {
    assignedGrades?: GradeLevel[];
    assignedCourses?: string[];
    assignedSubjects?: string[];
    classTeacherGrade?: GradeLevel;
    assignmentRole?: TeacherAssignmentRole;
  }
): DistinctStaffCourse[] {
  const assignedGrades = teacher.assignedGrades || [];
  const assignedSubjects = (teacher.assignedSubjects || []).map(s => normalizeCourseName(s).toLowerCase());
  const assignedCourseIds = teacher.assignedCourses || [];

  // 1. Filter: Course must belong to the staff's assigned grade(s), specific assigned subjects, or assigned IDs
  const relevantCourses = allCourses.filter(course => {
    // If teacher has assigned courses by ID
    if (assignedCourseIds.length > 0 && assignedCourseIds.includes(course.id)) {
      return true;
    }

    const normName = normalizeCourseName(course.name).toLowerCase();

    // If teacher has assigned subjects
    if (assignedSubjects.length > 0 && assignedSubjects.includes(normName)) {
      // Must also match grade if assignedGrades is set
      if (assignedGrades.length === 0 || assignedGrades.includes(course.grade)) {
        return true;
      }
    }

    // Standard class teacher or general grade assignment
    if (assignedGrades.length > 0 && assignedGrades.includes(course.grade)) {
      return true;
    }

    return false;
  });

  // 2. Deduplicate: Group by normalized course title so a subject like "Mathematics" appears ONLY ONCE
  const grouped = new Map<string, DistinctStaffCourse>();

  for (const course of relevantCourses) {
    const cleanName = normalizeCourseName(course.name);
    const key = cleanName.toLowerCase();

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: course.id,
        name: cleanName,
        description: course.description || '',
        grades: [course.grade],
        primaryGrade: course.grade,
        originalCourse: course
      });
    } else {
      const existing = grouped.get(key)!;
      if (!existing.grades.includes(course.grade)) {
        existing.grades.push(course.grade);
      }
      if (!existing.description && course.description) {
        existing.description = course.description;
      }
    }
  }

  // Sort alphabetically by course name
  return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Deduplicates any general course array by normalized course title.
 * Used for school-wide subject selectors, marksheet subject dropdowns, and admin curriculum views.
 */
export function deduplicateCourses(courses: Course[]): { name: string; grades: GradeLevel[]; courses: Course[] }[] {
  const map = new Map<string, { name: string; grades: GradeLevel[]; courses: Course[] }>();

  for (const c of courses) {
    const clean = normalizeCourseName(c.name);
    const key = clean.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        name: clean,
        grades: [c.grade],
        courses: [c]
      });
    } else {
      const entry = map.get(key)!;
      if (!entry.grades.includes(c.grade)) {
        entry.grades.push(c.grade);
      }
      entry.courses.push(c);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
