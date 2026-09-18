/**
 * Academic Session Utility for God's Hand International Model School
 * 
 * Automatically updates every year based on current calendar date.
 * In Nigeria, the primary academic session begins around September (First Term),
 * running through July/August of the following calendar year.
 */

export const getCurrentAcademicSession = (date: Date = new Date()): string => {
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth(); // 0 = Jan, 7 = Aug, 8 = Sep
  
  // If month is August or later (>= 7), the active/incoming session starts this calendar year
  // Otherwise, the session began in the previous calendar year
  const startYear = currentMonth >= 7 ? currentYear : currentYear - 1;
  return `${startYear}/${startYear + 1} Academic Session`;
};

export const getNowEnrollingSession = (date: Date = new Date()): string => {
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth();
  
  // Admissions for the upcoming session start gearing up from May/June (month >= 4)
  const startYear = currentMonth >= 4 ? currentYear : currentYear - 1;
  return `${startYear}/${startYear + 1} Academic Session`;
};

export const getSessionYears = (date: Date = new Date()): { startYear: number; endYear: number } => {
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth();
  const startYear = currentMonth >= 7 ? currentYear : currentYear - 1;
  return { startYear, endYear: startYear + 1 };
};
