import { ClassTimetable, GradeLevel, TimetablePeriod } from '../types';

export const DAYS_OF_WEEK: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday')[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday'
];

export const STANDARD_PERIOD_TIMES = [
  { start: '08:00', end: '08:45', label: 'Period 1' },
  { start: '08:45', end: '09:30', label: 'Period 2' },
  { start: '09:30', end: '09:50', label: 'Short Break / Snack' },
  { start: '09:50', end: '10:35', label: 'Period 3' },
  { start: '10:35', end: '11:20', label: 'Period 4' },
  { start: '11:20', end: '12:05', label: 'Period 5' },
  { start: '12:05', end: '12:50', label: 'Long Break & Lunch' },
  { start: '12:50', end: '01:35', label: 'Period 6' },
  { start: '01:35', end: '02:15', label: 'Period 7' },
];

export const createDefaultClassTimetable = (grade: GradeLevel, term: string = 'First Term'): ClassTimetable => {
  const isSecondary = grade.startsWith('JSS') || grade.startsWith('SS');
  const isEarlyYears = grade.startsWith('Crèche') || grade.startsWith('Pre') || grade.startsWith('Nursery') || grade.startsWith('KG');

  const subjectRotation: Record<string, string[]> = isEarlyYears ? {
    Monday: ['Phonics & Rhymes', 'Number Work', 'Snack Break', 'Letter Work', 'Coloring & Art', 'Lunch', 'Story Time', 'Rest & Play'],
    Tuesday: ['Health Habits', 'Letter Work', 'Snack Break', 'Number Work', 'Social Habits', 'Lunch', 'Music & Movement', 'Play Time'],
    Wednesday: ['Bible Stories', 'Phonics & Speech', 'Snack Break', 'Writing Skills', 'Handwriting', 'Lunch', 'Games & Outdoor', 'Rest'],
    Thursday: ['Science & Discovery', 'Number Work', 'Snack Break', 'Rhymes & Poetry', 'Fine Motor Skills', 'Lunch', 'Video & Cartoons', 'Play'],
    Friday: ['Mental Math', 'Language Drill', 'Snack Break', 'Spelling Bee', 'Morals & Manners', 'Lunch', 'Friday Assembly', 'Dismissal Prep']
  } : isSecondary ? {
    Monday: ['Mathematics', 'English Language', 'Short Break', 'Basic Science', 'Social Studies', 'Long Break & Lunch', 'Civic Education', 'Agricultural Science'],
    Tuesday: ['English Language', 'Mathematics', 'Short Break', 'Basic Technology', 'Business Studies', 'Long Break & Lunch', 'ICT / Computer Studies', 'Christian Rel. Studies'],
    Wednesday: ['Basic Science', 'Physical & Health Ed', 'Short Break', 'Mathematics', 'Yoruba / French', 'Long Break & Lunch', 'Home Economics', 'Music / Fine Art'],
    Thursday: ['English Literature', 'Civic Education', 'Short Break', 'Agricultural Science', 'Mathematics', 'Long Break & Lunch', 'Cultural & Creative Arts', 'Library Period'],
    Friday: ['Mathematics Drill', 'English Comprehension', 'Short Break', 'Computer Practical', 'General Knowledge', 'Long Break & Lunch', 'Sports & Clubs', 'Weekly Review']
  } : {
    // Primary / Basic classes
    Monday: ['Mathematics', 'English Studies', 'Short Break', 'Basic Science & Tech', 'Social Studies', 'Long Break & Lunch', 'National Values & Civic', 'Quantitative Reasoning'],
    Tuesday: ['English Language', 'Mathematics', 'Short Break', 'Agricultural Science', 'Home Economics', 'Long Break & Lunch', 'Verbal Reasoning', 'Computer Studies'],
    Wednesday: ['Mathematics', 'Verbal Reasoning', 'Short Break', 'Basic Science', 'Cultural & Creative Art', 'Long Break & Lunch', 'Christian Rel. Knowledge', 'Handwriting & Phonics'],
    Thursday: ['English Composition', 'Quantitative Reasoning', 'Short Break', 'Social Studies', 'Mathematics', 'Long Break & Lunch', 'Vocational Studies', 'Reading & Spelling'],
    Friday: ['Mental Arithmetic', 'Dictation & Spelling', 'Short Break', 'Health Education', 'French / Yoruba', 'Long Break & Lunch', 'Physical Education', 'Club Activities']
  };

  const times = [
    { start: '08:00', end: '08:45' },
    { start: '08:45', end: '09:30' },
    { start: '09:30', end: '09:50' }, // break
    { start: '09:50', end: '10:35' },
    { start: '10:35', end: '11:20' },
    { start: '11:20', end: '12:05' },
    { start: '12:05', end: '12:50' }, // lunch
    { start: '12:50', end: '01:35' },
  ];

  const periods: TimetablePeriod[] = [];
  let counter = 1;

  DAYS_OF_WEEK.forEach(day => {
    const subjects = subjectRotation[day] || subjectRotation['Monday'];
    times.forEach((slot, idx) => {
      const subject = subjects[idx] || 'Independent Study';
      const isBreak = subject.toLowerCase().includes('break') || subject.toLowerCase().includes('lunch');
      periods.push({
        id: `P-${grade.replace(/\s+/g, '')}-${day.slice(0, 3)}-${counter++}`,
        day,
        startTime: slot.start,
        endTime: slot.end,
        subject,
        teacherName: isBreak ? 'Duty Teacher' : 'Class Teacher',
        room: `Room ${grade}`
      });
    });
  });

  return {
    id: `TT-${grade.replace(/[^a-zA-Z0-9]/g, '-')}`,
    grade,
    term,
    academicYear: '2026/2027',
    periods,
    notes: `Official Class Timetable for ${grade}. Please ensure pupils arrive punctually at 7:45 AM for morning devotion.`,
    updatedAt: new Date().toISOString(),
    updatedBy: 'School Academic Office'
  };
};

export const INITIAL_DEFAULT_TIMETABLES: ClassTimetable[] = [
  createDefaultClassTimetable('Primary 4', 'First Term'),
  createDefaultClassTimetable('Basic 1', 'First Term'),
  createDefaultClassTimetable('Basic 2', 'First Term'),
  createDefaultClassTimetable('Basic 3', 'First Term'),
  createDefaultClassTimetable('Basic 4', 'First Term'),
  createDefaultClassTimetable('Basic 5', 'First Term'),
  createDefaultClassTimetable('JSS 1', 'First Term'),
  createDefaultClassTimetable('JSS 2', 'First Term'),
  createDefaultClassTimetable('JSS 3', 'First Term'),
  createDefaultClassTimetable('Nursery 1', 'First Term'),
  createDefaultClassTimetable('Nursery 2', 'First Term')
];
