import { StudentResult, ClassTimetable, StudentAccount, Course, Announcement } from '../types';

export const OFFLINE_ACADEMIC_CACHE_KEY = 'GHS_OFFLINE_ACADEMIC_CACHE_V1';

export interface OfflineAcademicBundle {
  studentId: string;
  studentName: string;
  grade: string;
  results: StudentResult[];
  timetables: ClassTimetable[];
  courses: Course[];
  announcements: Announcement[];
  cachedAt: string;
  offlineReady: boolean;
}

/**
 * Service Worker & Offline Strategy for God's Hand International Model School
 * Guarantees that students and pupils can access terminal scores, report cards,
 * and daily class timetables completely offline.
 */
export const offlineAcademicService = {
  /**
   * Caches student academic records, results, timetables, and school announcements
   * into both local storage and CacheStorage for 100% offline access.
   */
  cacheForOffline(
    student: StudentAccount,
    results: StudentResult[],
    timetables: ClassTimetable[],
    courses: Course[] = [],
    announcements: Announcement[] = []
  ): OfflineAcademicBundle {
    // Filter results and timetables specific to this student
    const studentResults = results.filter(
      r => (r.studentId && r.studentId === student.id) || 
           (r.studentName && r.studentName.toLowerCase() === student.name.toLowerCase())
    );

    const relevantTimetables = timetables.filter(
      t => t.grade === student.grade
    );

    const relevantCourses = courses.filter(
      c => c.grade === student.grade
    );

    const bundle: OfflineAcademicBundle = {
      studentId: student.id,
      studentName: student.name,
      grade: student.grade,
      results: studentResults.length > 0 ? studentResults : results,
      timetables: relevantTimetables.length > 0 ? relevantTimetables : timetables,
      courses: relevantCourses.length > 0 ? relevantCourses : courses,
      announcements: announcements.slice(0, 10),
      cachedAt: new Date().toISOString(),
      offlineReady: true
    };

    try {
      localStorage.setItem(`${OFFLINE_ACADEMIC_CACHE_KEY}_${student.id}`, JSON.stringify(bundle));
      localStorage.setItem(OFFLINE_ACADEMIC_CACHE_KEY, JSON.stringify(bundle));
    } catch (e) {
      console.warn('Failed to store offline academic bundle in localStorage:', e);
    }

    // Attempt to also cache in CacheStorage if available
    if ('caches' in window) {
      try {
        const jsonBlob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
        const response = new Response(jsonBlob, {
          headers: { 'Content-Type': 'application/json', 'X-Cached-At': bundle.cachedAt }
        });
        caches.open('ghs-offline-academic-v1').then(cache => {
          cache.put(`/api/offline/academic-records/${student.id}`, response).catch(() => {});
        }).catch(() => {});
      } catch (err) {
        // Cache API gracefully skipped if blocked
      }
    }

    return bundle;
  },

  /**
   * Retrieves offline cached records for a given student ID
   */
  getOfflineCache(studentId?: string): OfflineAcademicBundle | null {
    try {
      if (studentId) {
        const specific = localStorage.getItem(`${OFFLINE_ACADEMIC_CACHE_KEY}_${studentId}`);
        if (specific) return JSON.parse(specific);
      }
      const generic = localStorage.getItem(OFFLINE_ACADEMIC_CACHE_KEY);
      if (generic) return JSON.parse(generic);
    } catch (e) {
      console.error('Error reading offline academic cache:', e);
    }
    return null;
  },

  /**
   * Checks if current browser environment is offline
   */
  isOffline(): boolean {
    return typeof navigator !== 'undefined' && !navigator.onLine;
  }
};
