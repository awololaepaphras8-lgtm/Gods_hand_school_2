import { GradeLevel, StudentAccount, StudentResult } from '../types';

/**
 * Format a number as an ordinal string: 1 -> '1st', 2 -> '2nd', 3 -> '3rd', 4 -> '4th', etc.
 */
export const formatOrdinal = (n: number): string => {
  if (!n || n <= 0) return '-';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export interface StudentClassStanding {
  studentId?: string;
  studentName: string;
  grade: GradeLevel;
  totalScore: number;
  averageScore: number;
  subjectCount: number;
  position: number;
  positionOrdinal: string;
  totalStudentsInClass: number;
  systemPosition: number;
  systemPositionOrdinal: string;
  totalStudentsInSystem: number;
}

export interface StudentSubjectStanding {
  studentName: string;
  subject: string;
  grade: GradeLevel;
  term: string;
  score: number;
  caScore: number;
  examScore: number;
  position: number;
  positionOrdinal: string;
  totalInSubject: number;
}

/**
 * Compute positions from 1st to last for all students in a given grade and term,
 * as well as across the entire school system.
 */
export const computeClassRankings = (
  results: StudentResult[],
  students: StudentAccount[],
  grade: GradeLevel,
  term: string
): Map<string, StudentClassStanding> => {
  const rankingMap = new Map<string, StudentClassStanding>();

  // 1. Filter students in this grade
  const classStudents = students.filter(s => s.grade === grade);

  // If no students in class, return empty map
  if (classStudents.length === 0) return rankingMap;

  // 2. Compute performance for each student in the class for the specified term
  const classPerformances = classStudents.map(student => {
    const studentResults = results.filter(r => 
      r.grade === grade &&
      r.term.toLowerCase() === term.toLowerCase() &&
      r.studentName.trim().toLowerCase() === student.name.trim().toLowerCase()
    );

    const subjectCount = studentResults.length;
    const totalScore = studentResults.reduce((sum, r) => sum + r.score, 0);
    const averageScore = subjectCount > 0 ? parseFloat((totalScore / subjectCount).toFixed(2)) : 0;

    return {
      studentId: student.id,
      studentName: student.name,
      grade: student.grade,
      totalScore,
      averageScore,
      subjectCount
    };
  });

  // Sort descending by averageScore, then totalScore
  classPerformances.sort((a, b) => {
    if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
    return b.totalScore - a.totalScore;
  });

  // Assign class rank (1st to last number) with tie handling
  let currentRank = 1;
  classPerformances.forEach((perf, index) => {
    if (index > 0) {
      const prev = classPerformances[index - 1];
      if (perf.averageScore < prev.averageScore) {
        currentRank = index + 1;
      }
    }
    const position = currentRank;
    const positionOrdinal = formatOrdinal(position);

    rankingMap.set(perf.studentName.trim().toLowerCase(), {
      studentId: perf.studentId,
      studentName: perf.studentName,
      grade: perf.grade,
      totalScore: perf.totalScore,
      averageScore: perf.averageScore,
      subjectCount: perf.subjectCount,
      position,
      positionOrdinal,
      totalStudentsInClass: classStudents.length,
      systemPosition: position, // will update below
      systemPositionOrdinal: positionOrdinal,
      totalStudentsInSystem: students.length
    });
  });

  // 3. Also compute school-wide system ranking across ALL students for this term
  const allPerformances = students.map(student => {
    const sResults = results.filter(r => 
      r.term.toLowerCase() === term.toLowerCase() &&
      r.studentName.trim().toLowerCase() === student.name.trim().toLowerCase()
    );
    const count = sResults.length;
    const total = sResults.reduce((sum, r) => sum + r.score, 0);
    const avg = count > 0 ? parseFloat((total / count).toFixed(2)) : 0;
    return {
      name: student.name.trim().toLowerCase(),
      total,
      avg,
      count
    };
  }).sort((a, b) => b.avg - a.avg);

  let allRank = 1;
  allPerformances.forEach((p, idx) => {
    if (idx > 0 && p.avg < allPerformances[idx - 1].avg) {
      allRank = idx + 1;
    }
    const existing = rankingMap.get(p.name);
    if (existing) {
      existing.systemPosition = allRank;
      existing.systemPositionOrdinal = formatOrdinal(allRank);
      existing.totalStudentsInSystem = students.length;
    }
  });

  return rankingMap;
};

/**
 * Compute positions from 1st to last for each student in a specific subject.
 */
export const computeSubjectRankings = (
  results: StudentResult[],
  subject: string,
  grade: GradeLevel,
  term: string
): Map<string, StudentSubjectStanding> => {
  const map = new Map<string, StudentSubjectStanding>();

  const subjectResults = results.filter(r => 
    r.grade === grade &&
    r.term.toLowerCase() === term.toLowerCase() &&
    r.subject.trim().toLowerCase() === subject.trim().toLowerCase()
  );

  if (subjectResults.length === 0) return map;

  // Sort descending by score
  const sorted = [...subjectResults].sort((a, b) => b.score - a.score);

  let rank = 1;
  sorted.forEach((r, idx) => {
    if (idx > 0 && r.score < sorted[idx - 1].score) {
      rank = idx + 1;
    }
    const ca = r.caScore !== undefined ? r.caScore : Math.round(r.score * 0.4);
    const exam = r.examScore !== undefined ? r.examScore : (r.score - ca);

    map.set(r.studentName.trim().toLowerCase(), {
      studentName: r.studentName,
      subject: r.subject,
      grade: r.grade,
      term: r.term,
      score: r.score,
      caScore: ca,
      examScore: exam,
      position: rank,
      positionOrdinal: formatOrdinal(rank),
      totalInSubject: sorted.length
    });
  });

  return map;
};
