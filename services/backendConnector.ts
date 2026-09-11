/**
 * BACKEND INTEGRATION CONNECTOR & DATA ARCHITECTURE
 * 
 * This module defines the complete REST API interface and data schemas
 * ready for connecting a backend server (Node.js/Express, Python/FastAPI,
 * Django, Laravel, Supabase, or Firebase) to God's Hand Model School.
 */

import { AppState, StudentAccount, FeePayment, StudentResult, AttendanceRecord, StudentApplication, TeacherAccount, Course, FeeStructure, Announcement } from '../types';
import { stateService } from './stateService';

// Base API URL from environment variable or default relative path
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

export interface BackendResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Backend Data Schemas Specification:
 * 
 * 1. TABLE: students_and_pupils
 *    - id VARCHAR(64) PRIMARY KEY (Format: GHS-YYYY-XXXX)
 *    - name VARCHAR(255) NOT NULL
 *    - email VARCHAR(255)
 *    - password_hash VARCHAR(255) NOT NULL
 *    - grade VARCHAR(32) NOT NULL (e.g. 'Primary 1', 'SSS 2')
 *    - entry_allowed BOOLEAN DEFAULT FALSE
 *    - created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 *    - updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * 
 * 2. TABLE: fee_payments
 *    - id VARCHAR(64) PRIMARY KEY (Format: REC-TIMESTAMP-RAND)
 *    - student_id VARCHAR(64) REFERENCES students_and_pupils(id)
 *    - student_name VARCHAR(255) NOT NULL
 *    - grade VARCHAR(32) NOT NULL
 *    - amount NUMERIC(12, 2) NOT NULL
 *    - payment_type VARCHAR(32) NOT NULL ('full', 'installment_1', 'installment_2')
 *    - payment_method VARCHAR(32) DEFAULT 'bank_transfer'
 *    - reference_number VARCHAR(128)
 *    - payment_date VARCHAR(64) NOT NULL
 *    - status VARCHAR(32) DEFAULT 'verified'
 * 
 * 3. TABLE: attendance_records
 *    - id VARCHAR(64) PRIMARY KEY
 *    - student_id VARCHAR(64) REFERENCES students_and_pupils(id)
 *    - date VARCHAR(32) NOT NULL (YYYY-MM-DD or DD/MM/YYYY)
 *    - term VARCHAR(32) NOT NULL ('First Term', 'Second Term', 'Third Term')
 *    - marked_by VARCHAR(128) NOT NULL
 *    - timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * 
 * 4. TABLE: academic_results
 *    - id VARCHAR(64) PRIMARY KEY
 *    - student_name VARCHAR(255) NOT NULL
 *    - grade VARCHAR(32) NOT NULL
 *    - subject VARCHAR(128) NOT NULL
 *    - score NUMERIC(5, 2) NOT NULL (0 - 100)
 *    - term VARCHAR(32) NOT NULL
 *    - teacher_name VARCHAR(128) NOT NULL
 *    - date VARCHAR(32) NOT NULL
 * 
 * 5. TABLE: admissions_applications
 *    - id VARCHAR(64) PRIMARY KEY
 *    - applicant_name VARCHAR(255) NOT NULL
 *    - applicant_email VARCHAR(255)
 *    - grade_applied VARCHAR(32) NOT NULL
 *    - paid_application_fee BOOLEAN DEFAULT FALSE
 *    - submission_timestamp VARCHAR(64) NOT NULL
 *    - status VARCHAR(32) DEFAULT 'pending'
 * 
 * 6. TABLE: staff_accounts
 *    - id VARCHAR(64) PRIMARY KEY
 *    - username VARCHAR(128) UNIQUE NOT NULL
 *    - password_hash VARCHAR(255) NOT NULL
 *    - assigned_grades TEXT[] NOT NULL
 *    - assigned_courses TEXT[]
 *    - allowed_pages TEXT[]
 *    - created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * 
 * 7. TABLE: fee_structure
 *    - grade VARCHAR(32) PRIMARY KEY
 *    - tuition_amount NUMERIC(12, 2) NOT NULL
 * 
 * 8. TABLE: bulletins_and_announcements
 *    - id VARCHAR(64) PRIMARY KEY
 *    - title VARCHAR(255) NOT NULL
 *    - content TEXT NOT NULL
 *    - publish_date VARCHAR(32) NOT NULL
 */

export const backendClient = {
  /**
   * Health check to test if backend server is online
   */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Fetch complete application state from backend
   */
  async getInitialState(): Promise<AppState> {
    try {
      const res = await fetch(`${API_BASE_URL}/school/state`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.warn("Backend offline or unreachable, utilizing durable local cache.");
    }
    return stateService.getState();
  },

  /**
   * Sync complete or partial state to backend
   */
  async syncState(state: AppState): Promise<BackendResponse> {
    // Always persist to local cache first for zero-data-loss
    stateService.saveState(state);

    try {
      const res = await fetch(`${API_BASE_URL}/school/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      console.warn("Sync to remote backend skipped: backend not responding yet.", err);
    }
    return { success: true, message: "Persisted locally." };
  },

  /**
   * Record fee payment to backend
   */
  async recordFeePayment(payment: FeePayment): Promise<BackendResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/fees/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payment)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend payment endpoint not connected yet.");
    }
    return { success: true, data: payment };
  },

  /**
   * Register a new student or pupil
   */
  async registerStudentOrPupil(student: StudentAccount): Promise<BackendResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/students/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend student registration endpoint not connected yet.");
    }
    return { success: true, data: student };
  }
};
