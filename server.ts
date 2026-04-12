import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const db = new Database("inspection.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS prosecution_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    grade_order INTEGER NOT NULL,
    seniority INTEGER NOT NULL CHECK(seniority > 0),
    governorate TEXT,
    police_station TEXT,
    prosecution_office TEXT,
    national_id TEXT UNIQUE NOT NULL CHECK(length(national_id) = 14),
    phone1 TEXT,
    phone2 TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_pm_national_id ON prosecution_members(national_id);
  CREATE INDEX IF NOT EXISTS idx_pm_grade ON prosecution_members(grade);
  CREATE INDEX IF NOT EXISTS idx_pm_seniority ON prosecution_members(seniority);
  CREATE INDEX IF NOT EXISTS idx_pm_grade_order ON prosecution_members(grade_order);

  CREATE TABLE IF NOT EXISTS prosecution_offices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prosecution_name TEXT UNIQUE NOT NULL,
    members_count INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rank TEXT NOT NULL,
    prosecution_office TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS prosecutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incoming_number TEXT UNIQUE NOT NULL,
    incoming_date TEXT NOT NULL,
    complainant TEXT,
    complainant_id_number TEXT,
    subject TEXT NOT NULL,
    case_number TEXT,
    case_year TEXT,
    prosecution_name TEXT,
    prosecution_id INTEGER,
    analysis_number TEXT,
    category TEXT,
    complaint_category TEXT,
    decision TEXT,
    title TEXT,
    status TEXT DEFAULT 'draft', -- draft, inspection, investigation, council, finished, closed
    case_status_v2 TEXT,
    case_status_detail TEXT,
    trial_number TEXT,
    trial_year TEXT,
    current_stage TEXT DEFAULT 'incoming',
    examiner_id INTEGER,
    examiner_decision TEXT,
    reopen_reason TEXT,
    reopened_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(prosecution_id) REFERENCES prosecutions(id),
    FOREIGN KEY(examiner_id) REFERENCES prosecution_members(id)
  );

  CREATE TABLE IF NOT EXISTS case_members (
    case_id INTEGER,
    member_id INTEGER,
    role TEXT, -- subject_of_complaint, inspector, investigator
    FOREIGN KEY(case_id) REFERENCES cases(id),
    FOREIGN KEY(member_id) REFERENCES prosecution_members(id)
  );

  CREATE TABLE IF NOT EXISTS inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER UNIQUE,
    inspection_number TEXT NOT NULL,
    year TEXT NOT NULL,
    referral_date TEXT,
    inspector_id INTEGER,
    result TEXT,
    details JSON,
    is_closed INTEGER DEFAULT 0,
    FOREIGN KEY(case_id) REFERENCES cases(id),
    FOREIGN KEY(inspector_id) REFERENCES prosecution_members(id),
    UNIQUE(inspection_number, year)
  );

  CREATE TABLE IF NOT EXISTS investigations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER UNIQUE,
    investigation_number TEXT,
    year TEXT,
    type TEXT,
    subject TEXT,
    investigator_id INTEGER,
    referral_authority TEXT,
    referral_details JSON,
    result TEXT,
    is_closed INTEGER DEFAULT 0,
    FOREIGN KEY(case_id) REFERENCES cases(id),
    FOREIGN KEY(investigator_id) REFERENCES prosecution_members(id),
    UNIQUE(investigation_number, year)
  );

  CREATE TABLE IF NOT EXISTS objections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER,
    member_id INTEGER,
    objection_number TEXT,
    year TEXT,
    incoming_number TEXT,
    incoming_date TEXT,
    committee_1_id INTEGER,
    committee_2_id INTEGER,
    committee_3_id INTEGER,
    result TEXT,
    verdict TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(case_id) REFERENCES cases(id),
    FOREIGN KEY(member_id) REFERENCES prosecution_members(id),
    UNIQUE(objection_number, year)
  );

  CREATE TABLE IF NOT EXISTS disciplinary_councils (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER,
    type TEXT, -- normal, fitness
    details JSON,
    result TEXT,
    is_closed INTEGER DEFAULT 0,
    FOREIGN KEY(case_id) REFERENCES cases(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT,
    action TEXT,
    table_name TEXT,
    record_id INTEGER,
    old_values TEXT,
    new_values TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    old_rank TEXT,
    new_rank TEXT,
    promotion_date TEXT,
    FOREIGN KEY(member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    old_office TEXT,
    new_office TEXT,
    transfer_date TEXT,
    FOREIGN KEY(member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS reports_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_type TEXT NOT NULL, -- فحص, تحقيق, اعتراض
    record_number TEXT NOT NULL,
    record_year TEXT NOT NULL,
    member_name TEXT NOT NULL,
    member_role TEXT NOT NULL, -- فاحص, محقق, عضو1, عضو2, عضو3
    assignment_date TEXT,
    completion_date TEXT,
    task_status TEXT DEFAULT 'متداول', -- متداول, منتهي
    source_id INTEGER,
    UNIQUE(record_number, record_year, member_name, task_type, member_role)
  );
`);

// Add missing columns if they don't exist
try { db.exec("ALTER TABLE cases ADD COLUMN examiner_id INTEGER;"); } catch(e) {}
try { db.exec("ALTER TABLE cases ADD COLUMN examiner_decision TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE cases ADD COLUMN reopen_reason TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE cases ADD COLUMN reopened_by TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE cases ADD COLUMN case_status_v2 TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE cases ADD COLUMN case_status_detail TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE cases ADD COLUMN trial_number TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE cases ADD COLUMN trial_year TEXT;"); } catch(e) {}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // --- API Routes ---

  // Prosecution Offices (Formation) API
  app.post("/api/prosecution-offices/sync", (req, res) => {
    try {
      const transaction = db.transaction(() => {
        // Get distinct offices and counts from prosecution_members
        const offices = db.prepare(`
          SELECT prosecution_office, COUNT(*) as count 
          FROM prosecution_members 
          WHERE prosecution_office IS NOT NULL AND prosecution_office != ''
          GROUP BY prosecution_office
        `).all();

        // Clear existing offices or update them
        // The user wants to "create if not exists" and "update count"
        const insertOrUpdate = db.prepare(`
          INSERT INTO prosecution_offices (prosecution_name, members_count, last_updated)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(prosecution_name) DO UPDATE SET
            members_count = excluded.members_count,
            last_updated = CURRENT_TIMESTAMP
        `);

        for (const office of offices) {
          insertOrUpdate.run(office.prosecution_office, office.count);
        }

        // Optional: remove offices that no longer have members? 
        // User didn't specify, but it makes sense for "sync"
      });

      transaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/prosecution-offices", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM prosecution_offices ORDER BY prosecution_name ASC").all();
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/prosecution-offices", (req, res) => {
    const { prosecution_name } = req.body;
    try {
      const transaction = db.transaction(() => {
        const info = db.prepare("INSERT INTO prosecution_offices (prosecution_name, members_count, last_updated) VALUES (?, 0, CURRENT_TIMESTAMP)").run(prosecution_name);
        
        // Also add to prosecutions table if not exists
        const existing = db.prepare("SELECT id FROM prosecutions WHERE name = ?").get(prosecution_name);
        if (!existing) {
          db.prepare("INSERT INTO prosecutions (name) VALUES (?)").run(prosecution_name);
        }
        
        return info.lastInsertRowid;
      });
      
      const id = transaction();
      res.json({ id });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/prosecution-offices/:name/members", (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT * FROM prosecution_members 
        WHERE prosecution_office = ? 
        ORDER BY grade_order ASC, seniority ASC
      `).all(req.params.name);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/prosecution-offices/all-formations", (req, res) => {
    try {
      const offices = db.prepare("SELECT * FROM prosecution_offices ORDER BY prosecution_name ASC").all();
      const formations = offices.map(office => {
        const members = db.prepare(`
          SELECT * FROM prosecution_members 
          WHERE prosecution_office = ? 
          ORDER BY grade_order ASC, seniority ASC
        `).all(office.prosecution_name);
        return { ...office, members };
      });
      res.json(formations);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Prosecution Members API
  app.post("/api/system/clear-data", (req, res) => {
    try {
      const transaction = db.transaction(() => {
        db.prepare("DELETE FROM case_members").run();
        db.prepare("DELETE FROM inspections").run();
        db.prepare("DELETE FROM investigations").run();
        db.prepare("DELETE FROM objections").run();
        db.prepare("DELETE FROM disciplinary_councils").run();
        db.prepare("DELETE FROM audit_logs").run();
        db.prepare("DELETE FROM reports_tracking").run();
        db.prepare("DELETE FROM cases").run();
      });
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/prosecution-members", (req, res) => {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = "SELECT *, (SELECT COUNT(*) FROM prosecution_members) as total_count FROM prosecution_members";
    const params: any[] = [];

    if (search) {
      query += " WHERE name LIKE ? OR national_id LIKE ? OR grade LIKE ? OR prosecution_office LIKE ?";
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    query += " ORDER BY grade_order ASC, seniority ASC LIMIT ? OFFSET ?";
    params.push(Number(limit), offset);

    try {
      const rows = db.prepare(query).all(...params);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/prosecution-members", (req, res) => {
    const { name, grade, seniority, governorate, police_station, prosecution_office, national_id, phone1, phone2 } = req.body;
    
    const gradeOrders: Record<string, number> = {
      'رئيس هيئة': 1,
      'نائب رئيس هيئة': 2,
      'وكيل عام أول': 3,
      'وكيل عام': 4,
      'رئيس نيابة (أ)': 5,
      'رئيس نيابة (ب)': 6,
      'وكيل نيابة من الفئة الممتازة': 7,
      'وكيل نيابة': 8,
      'مساعد نيابة': 9,
      'معاون نيابة': 10
    };

    const grade_order = gradeOrders[grade] || 99;

    try {
      const info = db.prepare(`
        INSERT INTO prosecution_members (
          name, grade, grade_order, seniority, governorate, police_station, 
          prosecution_office, national_id, phone1, phone2
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name, grade, grade_order, seniority, governorate, police_station, prosecution_office, national_id, phone1, phone2);
      
      res.json({ id: info.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/prosecution-members/:id", (req, res) => {
    const { grade, seniority, governorate, police_station, prosecution_office, national_id, phone1, phone2 } = req.body;
    const id = req.params.id;

    const gradeOrders: Record<string, number> = {
      'رئيس هيئة': 1,
      'نائب رئيس هيئة': 2,
      'وكيل عام أول': 3,
      'وكيل عام': 4,
      'رئيس نيابة (أ)': 5,
      'رئيس نيابة (ب)': 6,
      'وكيل نيابة من الفئة الممتازة': 7,
      'وكيل نيابة': 8,
      'مساعد نيابة': 9,
      'معاون نيابة': 10
    };

    const grade_order = gradeOrders[grade] || 99;

    try {
      db.prepare(`
        UPDATE prosecution_members SET 
          grade = ?, grade_order = ?, seniority = ?, governorate = ?, 
          police_station = ?, prosecution_office = ?, national_id = ?, 
          phone1 = ?, phone2 = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(grade, grade_order, seniority, governorate, police_station, prosecution_office, national_id, phone1, phone2, id);
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/prosecution-members/import", (req, res) => {
    const { members } = req.body;
    if (!Array.isArray(members)) return res.status(400).json({ error: "Invalid data format" });

    const gradeOrders: Record<string, number> = {
      'رئيس هيئة': 1,
      'نائب رئيس هيئة': 2,
      'وكيل عام أول': 3,
      'وكيل عام': 4,
      'رئيس نيابة (أ)': 5,
      'رئيس نيابة (ب)': 6,
      'وكيل نيابة من الفئة الممتازة': 7,
      'وكيل نيابة': 8,
      'مساعد نيابة': 9,
      'معاون نيابة': 10
    };

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    const insertStmt = db.prepare(`
      INSERT INTO prosecution_members (
        name, grade, grade_order, seniority, governorate, police_station, 
        prosecution_office, national_id, phone1, phone2
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const checkStmt = db.prepare("SELECT id FROM prosecution_members WHERE national_id = ?");

    const transaction = db.transaction((data) => {
      for (const m of data) {
        try {
          if (!m.name || !m.grade || !m.prosecution_office || !m.national_id || String(m.national_id).length !== 14) {
            errors++;
            continue;
          }

          const existing = checkStmt.get(String(m.national_id));
          if (existing) {
            skipped++;
            continue;
          }

          const grade_order = gradeOrders[m.grade] || 99;
          insertStmt.run(
            m.name, m.grade, grade_order, m.seniority, m.governorate, 
            m.police_station, m.prosecution_office, String(m.national_id), 
            m.phone1, m.phone2
          );
          inserted++;
        } catch (e) {
          errors++;
        }
      }
    });

    try {
      transaction(members);
      res.json({ total: members.length, inserted, skipped, errors });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/prosecution-members/update-bulk", (req, res) => {
    const { members } = req.body;
    if (!Array.isArray(members)) return res.status(400).json({ error: "Invalid data format" });

    const gradeOrders: Record<string, number> = {
      'رئيس هيئة': 1,
      'نائب رئيس هيئة': 2,
      'وكيل عام أول': 3,
      'وكيل عام': 4,
      'رئيس نيابة (أ)': 5,
      'رئيس نيابة (ب)': 6,
      'وكيل نيابة من الفئة الممتازة': 7,
      'وكيل نيابة': 8,
      'مساعد نيابة': 9,
      'معاون نيابة': 10
    };

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    const updateStmt = db.prepare(`
      UPDATE prosecution_members SET 
        grade = ?, grade_order = ?, seniority = ?, governorate = ?, 
        police_station = ?, prosecution_office = ?, phone1 = ?, phone2 = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE national_id = ?
    `);

    const checkStmt = db.prepare("SELECT id FROM prosecution_members WHERE national_id = ?");

    const transaction = db.transaction((data) => {
      for (const m of data) {
        try {
          if (!m.grade || !m.prosecution_office || !m.national_id || String(m.national_id).length !== 14) {
            errors++;
            continue;
          }

          const nid = String(m.national_id);
          const existing = checkStmt.get(nid);
          if (!existing) {
            notFound++;
            continue;
          }

          const grade_order = gradeOrders[m.grade] || 99;
          updateStmt.run(
            m.grade, grade_order, m.seniority, m.governorate, 
            m.police_station, m.prosecution_office, m.phone1, m.phone2, nid
          );
          updated++;
        } catch (e) {
          errors++;
        }
      }
    });

    try {
      transaction(members);
      res.json({ total: members.length, updated, notFound, errors });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/prosecution-members/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM prosecution_members WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/prosecution-members/:id/full-history", (req, res) => {
    try {
      const id = req.params.id;
      const history = db.prepare(`
        SELECT 
          c.id as case_id,
          c.incoming_number,
          c.incoming_date,
          c.subject,
          c.status,
          c.current_stage,
          c.decision,
          i.inspection_number,
          i.year as inspection_year,
          i.result as inspection_result,
          inv.investigation_number,
          inv.year as investigation_year,
          inv.result as investigation_result,
          dc.type as council_type,
          dc.result as council_result
        FROM cases c
        JOIN case_members cm ON c.id = cm.case_id
        LEFT JOIN inspections i ON c.id = i.case_id
        LEFT JOIN investigations inv ON c.id = inv.case_id
        LEFT JOIN disciplinary_councils dc ON c.id = dc.case_id
        WHERE cm.member_id = ? AND cm.role = 'subject_of_complaint'
        ORDER BY c.created_at DESC
      `).all(id);
      res.json(history);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Members API
  app.get("/api/members", (req, res) => {
    const search = req.query.search as string;
    let query = "SELECT id, name, grade as rank, prosecution_office FROM prosecution_members";
    let params: any[] = [];
    if (search) {
      query += " WHERE name LIKE ? OR grade LIKE ? OR prosecution_office LIKE ?";
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    query += " ORDER BY grade_order ASC, seniority ASC";
    const members = db.prepare(query).all(...params);
    res.json(members);
  });

  app.post("/api/members", (req, res) => {
    const { name, rank, prosecution_office } = req.body;
    const info = db.prepare("INSERT INTO members (name, rank, prosecution_office) VALUES (?, ?, ?)").run(name, rank, prosecution_office);
    
    // Initial history
    db.prepare("INSERT INTO promotions (member_id, new_rank, promotion_date) VALUES (?, ?, ?)").run(info.lastInsertRowid, rank, new Date().toISOString().split('T')[0]);
    db.prepare("INSERT INTO transfers (member_id, new_office, transfer_date) VALUES (?, ?, ?)").run(info.lastInsertRowid, prosecution_office, new Date().toISOString().split('T')[0]);
    
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/members/:id", (req, res) => {
    const { rank, prosecution_office } = req.body;
    const id = req.params.id;
    const oldMember = db.prepare("SELECT * FROM members WHERE id = ?").get(id);

    if (rank && rank !== oldMember.rank) {
      db.prepare("UPDATE members SET rank = ? WHERE id = ?").run(rank, id);
      db.prepare("INSERT INTO promotions (member_id, old_rank, new_rank, promotion_date) VALUES (?, ?, ?, ?)").run(id, oldMember.rank, rank, new Date().toISOString().split('T')[0]);
    }

    if (prosecution_office && prosecution_office !== oldMember.prosecution_office) {
      db.prepare("UPDATE members SET prosecution_office = ? WHERE id = ?").run(prosecution_office, id);
      db.prepare("INSERT INTO transfers (member_id, old_office, new_office, transfer_date) VALUES (?, ?, ?, ?)").run(id, oldMember.prosecution_office, prosecution_office, new Date().toISOString().split('T')[0]);
    }

    res.json({ success: true });
  });

  app.get("/api/members/:id/history", (req, res) => {
    const id = req.params.id;
    const promotions = db.prepare("SELECT * FROM promotions WHERE member_id = ? ORDER BY promotion_date DESC").all(id);
    const transfers = db.prepare("SELECT * FROM transfers WHERE member_id = ? ORDER BY transfer_date DESC").all(id);
    res.json({ promotions, transfers });
  });

  app.delete("/api/members/:id", (req, res) => {
    const id = req.params.id;
    const activeCases = db.prepare("SELECT COUNT(*) as count FROM case_members WHERE member_id = ?").get(id);
    if (activeCases.count > 0) {
      return res.status(400).json({ error: "لا يمكن حذف عضو مرتبط بملفات نشطة في النظام" });
    }
    db.prepare("DELETE FROM members WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Cases API
  app.get("/api/cases", (req, res) => {
    const cases = db.prepare(`
      SELECT c.*, 
             p.name as prosecution_name
      FROM cases c
      LEFT JOIN prosecutions p ON c.prosecution_id = p.id
      ORDER BY c.updated_at DESC
    `).all();

    // Populate members for each case
    const casesWithMembers = cases.map((c: any) => {
      const members = db.prepare(`
        SELECT m.id, m.name, m.grade as rank, m.prosecution_office 
        FROM prosecution_members m 
        JOIN case_members cm ON m.id = cm.member_id 
        WHERE cm.case_id = ? AND cm.role = 'subject_of_complaint'
      `).all(c.id);

      const inspection = db.prepare("SELECT * FROM inspections WHERE case_id = ?").get(c.id);
      const investigation = db.prepare("SELECT * FROM investigations WHERE case_id = ?").get(c.id);

      return { 
        ...c, 
        member: members[0], 
        members,
        inspection,
        investigation
      };
    });

    res.json(casesWithMembers);
  });

  app.get("/api/cases/:id", (req, res) => {
    const caseData = db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id);
    if (!caseData) return res.status(404).json({ error: "Case not found" });
    
    const members = db.prepare(`
      SELECT m.id, m.name, m.grade as rank, m.prosecution_office FROM prosecution_members m 
      JOIN case_members cm ON m.id = cm.member_id 
      WHERE cm.case_id = ? AND cm.role = 'subject_of_complaint'
    `).all(req.params.id);

    const inspection = db.prepare("SELECT * FROM inspections WHERE case_id = ?").get(req.params.id);
    if (inspection && inspection.details) inspection.details = JSON.parse(inspection.details);

    const investigation = db.prepare("SELECT * FROM investigations WHERE case_id = ?").get(req.params.id);
    if (investigation && investigation.referral_details) investigation.referral_details = JSON.parse(investigation.referral_details);

    const councils = db.prepare("SELECT * FROM disciplinary_councils WHERE case_id = ?").all(req.params.id);
    councils.forEach(c => { if (c.details) c.details = JSON.parse(c.details); });

    res.json({ 
      ...caseData, 
      member: members[0], 
      members, 
      member_ids: members.map(m => m.id),
      inspection, 
      investigation, 
      councils 
    });
  });

  app.post("/api/cases", (req, res) => {
    console.log("POST /api/cases", req.body);
    const { 
      incoming_number, incoming_date, complainant, complainant_id_number, 
      subject, title, case_number, case_year, prosecution_id, prosecution_name,
      analysis_number, category, complaint_category, decision, status, member_id,
      member_ids, examiner_id, examiner_decision,
      case_status_v2, case_status_detail, trial_number, trial_year,
      inspection_data
    } = req.body;

    // Sanitize foreign keys to be NULL if empty or invalid
    const sanitized_prosecution_id = (prosecution_id && prosecution_id !== "" && prosecution_id !== "0") ? prosecution_id : null;
    const sanitized_member_id = (member_id && member_id !== 0 && member_id !== "0") ? member_id : null;
    const sanitized_examiner_id = (examiner_id && examiner_id !== 0 && examiner_id !== "0") ? examiner_id : null;
    
    const transaction = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO cases (
          incoming_number, incoming_date, complainant, complainant_id_number, 
          subject, title, case_number, case_year, prosecution_id, prosecution_name,
          analysis_number, category, complaint_category, decision, status,
          examiner_id, examiner_decision,
          case_status_v2, case_status_detail, trial_number, trial_year
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        incoming_number, incoming_date, complainant, complainant_id_number, 
        subject, title, case_number, case_year, sanitized_prosecution_id, prosecution_name,
        analysis_number, category, complaint_category, decision, status || 'draft',
        sanitized_examiner_id, examiner_decision,
        case_status_v2, case_status_detail, trial_number, trial_year
      );
      
      const caseId = info.lastInsertRowid;
      
      // Handle multiple members
      const final_member_ids = Array.isArray(member_ids) ? member_ids : (sanitized_member_id ? [sanitized_member_id] : []);
      final_member_ids.forEach((m_id: any) => {
        const id = (m_id && m_id !== 0 && m_id !== "0") ? m_id : null;
        if (id) {
          db.prepare("INSERT INTO case_members (case_id, member_id, role) VALUES (?, ?, 'subject_of_complaint')").run(caseId, id);
        }
      });

      if (decision === 'فحص' && inspection_data && status !== 'finished') {
        const { inspection_number, year, referral_date, inspector_id, members } = inspection_data;
        const sanitized_inspector_id = (inspector_id && inspector_id !== 0 && inspector_id !== "0") ? inspector_id : null;

        // Validate inspection number sequence
        const row = db.prepare("SELECT MAX(CAST(inspection_number AS INTEGER)) as max_num FROM inspections WHERE year = ?").get(year);
        const nextNum = (row?.max_num || 0) + 1;
        if (parseInt(inspection_number) !== nextNum) {
          throw new Error(`رقم الفحص غير صحيح أو تم تخطي أرقام. الرقم التالي المتاح لسنة ${year} هو ${nextNum}`);
        }

        db.prepare(`
          INSERT INTO inspections (case_id, inspection_number, year, referral_date, inspector_id, details)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(caseId, inspection_number, year, referral_date, sanitized_inspector_id, JSON.stringify({ members }));
        
        db.prepare("UPDATE cases SET status = 'inspection', current_stage = 'inspection' WHERE id = ?").run(caseId);
        
        // Add inspected members to case_members
        if (members && Array.isArray(members)) {
          members.forEach((m: any) => {
            const m_id = (m.member_id && m.member_id !== 0 && m.member_id !== "0") ? m.member_id : null;
            if (m_id) {
              db.prepare("INSERT INTO case_members (case_id, member_id, role) VALUES (?, ?, 'inspected_member')").run(caseId, m_id);
            }
          });
        }
      }

      db.prepare("INSERT INTO audit_logs (user_name, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)").run(
        "System", "CREATE", "cases", caseId, JSON.stringify(req.body)
      );

      // Sync reports and objections
      syncReports(db);

      // Extract and save objections to enforce uniqueness
      if (inspection_data && inspection_data.members) {
        const objectionYears: Record<string, number> = {};
        inspection_data.members.forEach((m: any) => {
          if (m.has_objection && m.objection_number) {
            const objYear = m.objection_year || inspection_data.year;
            
            // Check if objection already exists for this member/case
            const existing = db.prepare("SELECT objection_number FROM objections WHERE case_id = ? AND member_id = ?").get(caseId, m.member_id);
            if (existing) {
              if (existing.objection_number !== m.objection_number) {
                throw new Error("لا يجوز تعديل رقم الاعتراض بعد تسجيله");
              }
            } else {
              // Validate sequence for new objection
              if (!objectionYears[objYear]) {
                const row = db.prepare("SELECT MAX(CAST(objection_number AS INTEGER)) as max_num FROM objections WHERE year = ?").get(objYear);
                objectionYears[objYear] = (row?.max_num || 0) + 1;
              }
              
              if (parseInt(m.objection_number) !== objectionYears[objYear]) {
                throw new Error(`رقم الاعتراض ${m.objection_number} غير صحيح. الرقم التالي المتاح لسنة ${objYear} هو ${objectionYears[objYear]}`);
              }
              objectionYears[objYear]++;
            }

            try {
              db.prepare(`
                INSERT INTO objections (case_id, member_id, objection_number, year, incoming_number, incoming_date, result, verdict)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(objection_number, year) DO UPDATE SET
                  case_id = excluded.case_id,
                  member_id = excluded.member_id,
                  incoming_number = excluded.incoming_number,
                  incoming_date = excluded.incoming_date,
                  result = excluded.result,
                  verdict = excluded.verdict
              `).run(
                caseId, m.member_id, m.objection_number, objYear,
                m.objection_incoming_number, m.objection_date, m.objection_result, m.objection_verdict
              );
            } catch (e: any) {
              if (e.message.includes("UNIQUE constraint failed: objections.objection_number")) {
                throw new Error(`رقم الاعتراض ${m.objection_number} مسجل مسبقاً في النظام لسنة ${objYear}`);
              }
              throw e;
            }
          }
        });
      }

      return caseId;
    });

    try {
      const id = transaction();
      res.json({ id });
    } catch (e: any) {
      let error = e.message;
      if (e.message.includes("UNIQUE constraint failed: cases.incoming_number")) {
        error = "رقم الوارد هذا مسجل مسبقاً في النظام، يرجى استخدام رقم فريد";
      }
      res.status(400).json({ error });
    }
  });

  app.patch("/api/cases/:id", (req, res) => {
    const { status, current_stage, member_ids, inspection_data, ...updates } = req.body;
    const id = req.params.id;

    // Valid columns for the cases table
    const CASE_COLUMNS = [
      'incoming_number', 'incoming_date', 'complainant', 'complainant_id_number',
      'subject', 'case_number', 'case_year', 'prosecution_id', 'prosecution_name',
      'analysis_number', 'category', 'complaint_category', 'decision', 'title',
      'status', 'current_stage', 'examiner_id', 'examiner_decision',
      'reopen_reason', 'reopened_by', 'case_status_v2', 'case_status_detail',
      'trial_number', 'trial_year'
    ];

    // Filter updates to only include valid columns
    const filteredUpdates: any = {};
    Object.keys(updates).forEach(key => {
      if (CASE_COLUMNS.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Sanitize prosecution_id
    if (filteredUpdates.prosecution_id === "" || filteredUpdates.prosecution_id === "0" || filteredUpdates.prosecution_id === 0) {
      filteredUpdates.prosecution_id = null;
    }
    // Sanitize examiner_id
    if (filteredUpdates.examiner_id === "" || filteredUpdates.examiner_id === "0" || filteredUpdates.examiner_id === 0) {
      filteredUpdates.examiner_id = null;
    }

    const oldData = db.prepare("SELECT * FROM cases WHERE id = ?").get(id);
    
    const transaction = db.transaction(() => {
      // Update cases table
      const fields = Object.keys(filteredUpdates).map(k => `${k} = ?`).join(", ");
      const params = [...Object.values(filteredUpdates), id];

      if (fields) {
        db.prepare(`UPDATE cases SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...params);
      }

      if (status) {
        db.prepare("UPDATE cases SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
      }
      if (current_stage) {
        db.prepare("UPDATE cases SET current_stage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(current_stage, id);
      }

      // Handle multiple members update
      if (member_ids && Array.isArray(member_ids)) {
        // Delete old members for this role
        db.prepare("DELETE FROM case_members WHERE case_id = ? AND role = 'subject_of_complaint'").run(id);
        // Insert new ones
        member_ids.forEach((m_id: any) => {
          const mid = (m_id && m_id !== 0 && m_id !== "0") ? m_id : null;
          if (mid) {
            db.prepare("INSERT INTO case_members (case_id, member_id, role) VALUES (?, ?, 'subject_of_complaint')").run(id, mid);
          }
        });
      }

      // Handle inspection_data update
      if (inspection_data) {
        const { inspection_number, year, referral_date, inspector_id, members } = inspection_data;
        const sanitized_inspector_id = (inspector_id && inspector_id !== 0 && inspector_id !== "0") ? inspector_id : null;

        // Check if inspection exists
        const existingInspection = db.prepare("SELECT id, inspection_number, year FROM inspections WHERE case_id = ?").get(id);
        if (existingInspection) {
          // If inspection_number is already set, don't allow changing it
          if (existingInspection.inspection_number && existingInspection.inspection_number !== inspection_number) {
            throw new Error("لا يجوز تعديل رقم الفحص بعد تسجيله");
          }
          // If year is already set, don't allow changing it
          if (existingInspection.year && existingInspection.year !== year) {
            throw new Error("لا يجوز تعديل سنة الفحص بعد تسجيلها");
          }
          
          db.prepare(`
            UPDATE inspections 
            SET inspection_number = ?, year = ?, referral_date = ?, inspector_id = ?, details = ?
            WHERE case_id = ?
          `).run(inspection_number, year, referral_date, sanitized_inspector_id, JSON.stringify({ members }), id);
        } else {
          // Validate inspection number sequence for new inspection
          const row = db.prepare("SELECT MAX(CAST(inspection_number AS INTEGER)) as max_num FROM inspections WHERE year = ?").get(year);
          const nextNum = (row?.max_num || 0) + 1;
          if (parseInt(inspection_number) !== nextNum) {
            throw new Error(`رقم الفحص غير صحيح أو تم تخطي أرقام. الرقم التالي المتاح لسنة ${year} هو ${nextNum}`);
          }

          db.prepare(`
            INSERT INTO inspections (case_id, inspection_number, year, referral_date, inspector_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(id, inspection_number, year, referral_date, sanitized_inspector_id, JSON.stringify({ members }));
        }

        // Update case status/stage if it's an inspection and no status was provided
        if (req.body.decision === 'فحص' && !status) {
          db.prepare("UPDATE cases SET status = 'inspection', current_stage = 'inspection' WHERE id = ?").run(id);
        }

        // Update inspected members
        if (members && Array.isArray(members)) {
          db.prepare("DELETE FROM case_members WHERE case_id = ? AND role = 'inspected_member'").run(id);
          members.forEach((m: any) => {
            const m_id = (m.member_id && m.member_id !== 0 && m.member_id !== "0") ? m.member_id : null;
            if (m_id) {
              db.prepare("INSERT INTO case_members (case_id, member_id, role) VALUES (?, ?, 'inspected_member')").run(id, m_id);
            }
          });
        }
      }

      db.prepare("INSERT INTO audit_logs (user_name, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)").run(
        "System", "UPDATE", "cases", id, JSON.stringify(oldData), JSON.stringify(req.body)
      );
      syncReports(db);

      // Extract and save objections to enforce uniqueness
      if (inspection_data && inspection_data.members) {
        const objectionYears: Record<string, number> = {};
        inspection_data.members.forEach((m: any) => {
          if (m.has_objection && m.objection_number) {
            const objYear = m.objection_year || inspection_data.year;

            // Check if objection already exists for this member/case
            const existing = db.prepare("SELECT objection_number FROM objections WHERE case_id = ? AND member_id = ?").get(id, m.member_id);
            if (existing) {
              if (existing.objection_number !== m.objection_number) {
                throw new Error("لا يجوز تعديل رقم الاعتراض بعد تسجيله");
              }
            } else {
              // Validate sequence for new objection
              if (!objectionYears[objYear]) {
                const row = db.prepare("SELECT MAX(CAST(objection_number AS INTEGER)) as max_num FROM objections WHERE year = ?").get(objYear);
                objectionYears[objYear] = (row?.max_num || 0) + 1;
              }
              
              if (parseInt(m.objection_number) !== objectionYears[objYear]) {
                throw new Error(`رقم الاعتراض ${m.objection_number} غير صحيح. الرقم التالي المتاح لسنة ${objYear} هو ${objectionYears[objYear]}`);
              }
              objectionYears[objYear]++;
            }

            try {
              db.prepare(`
                INSERT INTO objections (case_id, member_id, objection_number, year, incoming_number, incoming_date, result, verdict)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(objection_number, year) DO UPDATE SET
                  case_id = excluded.case_id,
                  member_id = excluded.member_id,
                  incoming_number = excluded.incoming_number,
                  incoming_date = excluded.incoming_date,
                  result = excluded.result,
                  verdict = excluded.verdict
              `).run(
                id, m.member_id, m.objection_number, objYear,
                m.objection_incoming_number, m.objection_date, m.objection_result, m.objection_verdict
              );
            } catch (e: any) {
              if (e.message.includes("UNIQUE constraint failed: objections.objection_number")) {
                throw new Error(`رقم الاعتراض ${m.objection_number} مسجل مسبقاً في النظام لسنة ${objYear}`);
              }
              throw e;
            }
          }
        });
      }
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Inspections API
  app.get("/api/inspections/next-number", (req, res) => {
    const year = req.query.year || new Date().getFullYear().toString();
    try {
      const row = db.prepare("SELECT MAX(CAST(inspection_number AS INTEGER)) as max_num FROM inspections WHERE year = ?").get(year);
      const nextNum = (row?.max_num || 0) + 1;
      res.json({ nextNumber: nextNum.toString() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/inspections", (req, res) => {
    const { case_id, inspection_number, year, referral_date, inspector_id, result, details } = req.body;
    const sanitized_inspector_id = (inspector_id && inspector_id !== 0 && inspector_id !== "0") ? inspector_id : null;
    
    try {
      const transaction = db.transaction(() => {
        const info = db.prepare(`
          INSERT INTO inspections (case_id, inspection_number, year, referral_date, inspector_id, result, details)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(case_id, inspection_number, year, referral_date, sanitized_inspector_id, result, JSON.stringify(details || {}));
        
        const finishedResults = ['حفظ', 'ملحوظة', 'إحالة', 'ضم'];
        const isFinished = finishedResults.some(r => result?.includes(r));

        if (isFinished) {
          if (result?.includes('إحالة')) {
            db.prepare("UPDATE cases SET status = 'investigation', current_stage = 'investigation', case_status_v2 = 'متداول تحقيق', case_status_detail = 'قيد التحقيق' WHERE id = ?").run(case_id);
          } else {
            db.prepare("UPDATE cases SET status = 'finished', current_stage = 'inspection', case_status_v2 = 'منتهي فحص', case_status_detail = ? WHERE id = ?").run(result, case_id);
          }
        } else {
          db.prepare("UPDATE cases SET status = 'inspection', current_stage = 'inspection', case_status_v2 = 'متداول فحص', case_status_detail = 'قيد الفحص' WHERE id = ?").run(case_id);
        }
        
        db.prepare("INSERT INTO audit_logs (user_name, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)").run(
          "System", "CREATE", "inspections", case_id, JSON.stringify(req.body)
        );
        
        syncReports(db);

        // Extract and save objections from details
        if (details && details.members) {
          details.members.forEach((m: any) => {
            if (m.has_objection && m.objection_number) {
              try {
                db.prepare(`
                  INSERT INTO objections (case_id, member_id, objection_number, year, incoming_number, incoming_date, result, verdict)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(objection_number) DO UPDATE SET
                    case_id = excluded.case_id,
                    member_id = excluded.member_id,
                    year = excluded.year,
                    incoming_number = excluded.incoming_number,
                    incoming_date = excluded.incoming_date,
                    result = excluded.result,
                    verdict = excluded.verdict
                `).run(
                  case_id, m.member_id, m.objection_number, m.objection_year || year,
                  m.objection_incoming_number, m.objection_date, m.objection_result, m.objection_verdict
                );
              } catch (e: any) {
                if (e.message.includes("UNIQUE constraint failed: objections.objection_number")) {
                  throw new Error(`رقم الاعتراض ${m.objection_number} مسجل مسبقاً في النظام`);
                }
                throw e;
              }
            }
          });
        }
        
        return info.lastInsertRowid;
      });
      
      const id = transaction();
      res.json({ id });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/inspections/:id", (req, res) => {
    const { is_closed, result, details } = req.body;
    const id = req.params.id;
    
    const updates: string[] = [];
    const params: any[] = [];

    if (is_closed !== undefined) { updates.push("is_closed = ?"); params.push(is_closed); }
    if (result !== undefined) { updates.push("result = ?"); params.push(result); }
    if (details !== undefined) { updates.push("details = ?"); params.push(JSON.stringify(details)); }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE inspections SET ${updates.join(", ")} WHERE id = ?`).run(...params);
      
      // Update case status if finished via inspection result
      const insp = db.prepare("SELECT * FROM inspections WHERE id = ?").get(id);
      if (insp) {
        const finishedResults = ['حفظ', 'ملحوظة', 'إحالة', 'ضم'];
        const isFinished = finishedResults.some(r => insp.result?.includes(r));
        if (isFinished) {
          if (insp.result?.includes('إحالة')) {
            db.prepare("UPDATE cases SET status = 'investigation', current_stage = 'investigation', case_status_v2 = 'متداول تحقيق', case_status_detail = 'قيد التحقيق' WHERE id = ?").run(insp.case_id);
          } else {
            db.prepare("UPDATE cases SET status = 'finished', current_stage = 'inspection', case_status_v2 = 'منتهي فحص', case_status_detail = ? WHERE id = ?").run(insp.result, insp.case_id);
          }
        } else {
          db.prepare("UPDATE cases SET status = 'inspection', current_stage = 'inspection', case_status_v2 = 'متداول فحص', case_status_detail = 'قيد الفحص' WHERE id = ?").run(insp.case_id);
        }
      }
      
      syncReports(db);

      // Extract and save objections from details if provided
      if (details && details.members) {
        const insp = db.prepare("SELECT * FROM inspections WHERE id = ?").get(id);
        if (insp) {
          details.members.forEach((m: any) => {
            if (m.has_objection && m.objection_number) {
              try {
                db.prepare(`
                  INSERT INTO objections (case_id, member_id, objection_number, year, incoming_number, incoming_date, result, verdict)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(objection_number) DO UPDATE SET
                    case_id = excluded.case_id,
                    member_id = excluded.member_id,
                    year = excluded.year,
                    incoming_number = excluded.incoming_number,
                    incoming_date = excluded.incoming_date,
                    result = excluded.result,
                    verdict = excluded.verdict
                `).run(
                  insp.case_id, m.member_id, m.objection_number, m.objection_year || insp.year,
                  m.objection_incoming_number, m.objection_date, m.objection_result, m.objection_verdict
                );
              } catch (e: any) {
                if (e.message.includes("UNIQUE constraint failed: objections.objection_number")) {
                  throw new Error(`رقم الاعتراض ${m.objection_number} مسجل مسبقاً في النظام`);
                }
                throw e;
              }
            }
          });
        }
      }
    }

    res.json({ success: true });
  });

  // Investigations API
  app.get("/api/investigations/next-number", (req, res) => {
    const year = req.query.year || new Date().getFullYear().toString();
    try {
      const row = db.prepare("SELECT MAX(CAST(investigation_number AS INTEGER)) as max_num FROM investigations WHERE year = ?").get(year);
      const nextNum = (row?.max_num || 0) + 1;
      res.json({ nextNumber: nextNum.toString() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/objections/next-number", (req, res) => {
    const year = req.query.year || new Date().getFullYear().toString();
    try {
      const row = db.prepare("SELECT MAX(CAST(objection_number AS INTEGER)) as max_num FROM objections WHERE year = ?").get(year);
      const nextNum = (row?.max_num || 0) + 1;
      res.json({ nextNumber: nextNum.toString() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/investigations", (req, res) => {
    const { case_id, investigation_number, year, type, subject, investigator_id, referral_authority, referral_details } = req.body;
    try {
      const transaction = db.transaction(() => {
        // Validate investigation number sequence
        const row = db.prepare("SELECT MAX(CAST(investigation_number AS INTEGER)) as max_num FROM investigations WHERE year = ?").get(year);
        const nextNum = (row?.max_num || 0) + 1;
        if (parseInt(investigation_number) !== nextNum) {
          throw new Error(`رقم التحقيق غير صحيح أو تم تخطي أرقام. الرقم التالي المتاح لسنة ${year} هو ${nextNum}`);
        }

        const info = db.prepare(`
          INSERT INTO investigations (case_id, investigation_number, year, type, subject, investigator_id, referral_authority, referral_details)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(case_id, investigation_number, year, type, subject, investigator_id, referral_authority, JSON.stringify(referral_details || {}));
        
        const finishedResults = ['حفظ', 'ملحوظة', 'تنبيه', 'مجلس تأديب', 'ضم', 'منتهي تحقيق'];
        const isFinished = finishedResults.some(r => req.body.result?.includes(r));
        if (isFinished) {
          if (req.body.result?.includes('مجلس تأديب')) {
            db.prepare("UPDATE cases SET status = 'council', current_stage = 'council', case_status_v2 = 'متداول محاكمة', case_status_detail = 'قيد المحاكمة' WHERE id = ?").run(case_id);
          } else {
            db.prepare("UPDATE cases SET status = 'finished', current_stage = 'investigation', case_status_v2 = 'منتهي تحقيق', case_status_detail = ? WHERE id = ?").run(req.body.result, case_id);
          }
        } else {
          db.prepare("UPDATE cases SET status = 'investigation', current_stage = 'investigation', case_status_v2 = 'متداول تحقيق', case_status_detail = 'قيد التحقيق' WHERE id = ?").run(case_id);
        }
        
        db.prepare("INSERT INTO audit_logs (user_name, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)").run(
          "System", "CREATE", "investigations", case_id, JSON.stringify(req.body)
        );
        
        syncReports(db);

        // Extract and save objections from referral_details
        if (referral_details && referral_details.members) {
          const objectionYears: Record<string, number> = {};
          referral_details.members.forEach((m: any) => {
            if (m.has_objection && m.objection_number) {
              const objYear = m.objection_year || year;

              // Check if objection already exists for this member/case
              const existing = db.prepare("SELECT objection_number FROM objections WHERE case_id = ? AND member_id = ?").get(case_id, m.member_id);
              if (existing) {
                if (existing.objection_number !== m.objection_number) {
                  throw new Error("لا يجوز تعديل رقم الاعتراض بعد تسجيله");
                }
              } else {
                // Validate sequence for new objection
                if (!objectionYears[objYear]) {
                  const row = db.prepare("SELECT MAX(CAST(objection_number AS INTEGER)) as max_num FROM objections WHERE year = ?").get(objYear);
                  objectionYears[objYear] = (row?.max_num || 0) + 1;
                }
                
                if (parseInt(m.objection_number) !== objectionYears[objYear]) {
                  throw new Error(`رقم الاعتراض ${m.objection_number} غير صحيح. الرقم التالي المتاح لسنة ${objYear} هو ${objectionYears[objYear]}`);
                }
                objectionYears[objYear]++;
              }

              try {
                db.prepare(`
                  INSERT INTO objections (case_id, member_id, objection_number, year, incoming_number, incoming_date, result, verdict)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(objection_number, year) DO UPDATE SET
                    case_id = excluded.case_id,
                    member_id = excluded.member_id,
                    incoming_number = excluded.incoming_number,
                    incoming_date = excluded.incoming_date,
                    result = excluded.result,
                    verdict = excluded.verdict
                `).run(
                  case_id, m.member_id, m.objection_number, objYear,
                  m.objection_incoming_number, m.objection_date, m.objection_result, m.objection_verdict
                );
              } catch (e: any) {
                if (e.message.includes("UNIQUE constraint failed: objections.objection_number")) {
                  throw new Error(`رقم الاعتراض ${m.objection_number} مسجل مسبقاً في النظام لسنة ${objYear}`);
                }
                throw e;
              }
            }
          });
        }
        
        return info.lastInsertRowid;
      });
      
      const id = transaction();
      res.json({ id });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/investigations/:id", (req, res) => {
    const { is_closed, result, referral_details, investigation_number, year } = req.body;
    const id = req.params.id;
    
    const updates: string[] = [];
    const params: any[] = [];

    if (is_closed !== undefined) { updates.push("is_closed = ?"); params.push(is_closed); }
    if (result !== undefined) { updates.push("result = ?"); params.push(result); }
    if (referral_details !== undefined) { updates.push("referral_details = ?"); params.push(JSON.stringify(referral_details)); }

    const transaction = db.transaction(() => {
      const existing = db.prepare("SELECT * FROM investigations WHERE id = ?").get(id);
      if (!existing) throw new Error("التحقيق غير موجود");

      if (investigation_number !== undefined && existing.investigation_number && existing.investigation_number !== investigation_number) {
        throw new Error("لا يجوز تعديل رقم التحقيق بعد تسجيله");
      }
      if (year !== undefined && existing.year && existing.year !== year) {
        throw new Error("لا يجوز تعديل سنة التحقيق بعد تسجيلها");
      }

      if (updates.length > 0) {
        params.push(id);
        db.prepare(`UPDATE investigations SET ${updates.join(", ")} WHERE id = ?`).run(...params);

        // Update case status if finished via investigation result
        const inv = db.prepare("SELECT * FROM investigations WHERE id = ?").get(id);
        if (inv) {
          const finishedResults = ['حفظ', 'ملحوظة', 'تنبيه', 'مجلس تأديب', 'ضم', 'منتهي تحقيق'];
          const isFinished = finishedResults.some(r => inv.result?.includes(r));
          if (isFinished) {
            if (inv.result?.includes('مجلس تأديب')) {
              db.prepare("UPDATE cases SET status = 'council', current_stage = 'council', case_status_v2 = 'متداول محاكمة', case_status_detail = 'قيد المحاكمة' WHERE id = ?").run(inv.case_id);
            } else {
              db.prepare("UPDATE cases SET status = 'finished', current_stage = 'investigation', case_status_v2 = 'منتهي تحقيق', case_status_detail = ? WHERE id = ?").run(inv.result, inv.case_id);
            }
          } else {
            db.prepare("UPDATE cases SET status = 'investigation', current_stage = 'investigation', case_status_v2 = 'متداول تحقيق', case_status_detail = 'قيد التحقيق' WHERE id = ?").run(inv.case_id);
          }
        }

        syncReports(db);

        // Extract and save objections from referral_details if provided
        if (referral_details && referral_details.members) {
          const objectionYears: Record<string, number> = {};
          referral_details.members.forEach((m: any) => {
            if (m.has_objection && m.objection_number) {
              const objYear = m.objection_year || existing.year;

              // Check if objection already exists for this member/case
              const existingObj = db.prepare("SELECT objection_number FROM objections WHERE case_id = ? AND member_id = ?").get(existing.case_id, m.member_id);
              if (existingObj) {
                if (existingObj.objection_number !== m.objection_number) {
                  throw new Error("لا يجوز تعديل رقم الاعتراض بعد تسجيله");
                }
              } else {
                // Validate sequence for new objection
                if (!objectionYears[objYear]) {
                  const row = db.prepare("SELECT MAX(CAST(objection_number AS INTEGER)) as max_num FROM objections WHERE year = ?").get(objYear);
                  objectionYears[objYear] = (row?.max_num || 0) + 1;
                }
                
                if (parseInt(m.objection_number) !== objectionYears[objYear]) {
                  throw new Error(`رقم الاعتراض ${m.objection_number} غير صحيح. الرقم التالي المتاح لسنة ${objYear} هو ${objectionYears[objYear]}`);
                }
                objectionYears[objYear]++;
              }

              try {
                db.prepare(`
                  INSERT INTO objections (case_id, member_id, objection_number, year, incoming_number, incoming_date, result, verdict)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(objection_number, year) DO UPDATE SET
                    case_id = excluded.case_id,
                    member_id = excluded.member_id,
                    incoming_number = excluded.incoming_number,
                    incoming_date = excluded.incoming_date,
                    result = excluded.result,
                    verdict = excluded.verdict
                `).run(
                  existing.case_id, m.member_id, m.objection_number, objYear,
                  m.objection_incoming_number, m.objection_date, m.objection_result, m.objection_verdict
                );
              } catch (e: any) {
                if (e.message.includes("UNIQUE constraint failed: objections.objection_number")) {
                  throw new Error(`رقم الاعتراض ${m.objection_number} مسجل مسبقاً في النظام لسنة ${objYear}`);
                }
                throw e;
              }
            }
          });
        }
      }
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Disciplinary Councils API
  app.post("/api/councils", (req, res) => {
    const { case_id, type, details, result } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO disciplinary_councils (case_id, type, details, result)
        VALUES (?, ?, ?, ?)
      `).run(case_id, type, JSON.stringify(details || {}), result);
      
      db.prepare("UPDATE cases SET status = 'council', current_stage = 'council' WHERE id = ?").run(case_id);
      
      res.json({ id: info.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Prosecutions API
  app.get("/api/prosecutions", (req, res) => {
    const prosecutions = db.prepare("SELECT * FROM prosecutions ORDER BY name ASC").all();
    res.json(prosecutions);
  });

  app.post("/api/prosecutions", (req, res) => {
    const { name } = req.body;
    const info = db.prepare("INSERT INTO prosecutions (name) VALUES (?)").run(name);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/prosecutions/:id", (req, res) => {
    const id = req.params.id;
    const linkedCases = db.prepare("SELECT COUNT(*) as count FROM cases WHERE prosecution_id = ?").get(id);
    if (linkedCases.count > 0) {
      return res.status(400).json({ error: "لا يمكن حذف نيابة مرتبطة بقضايا نشطة" });
    }
    db.prepare("DELETE FROM prosecutions WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Audit Logs
  app.get("/api/audit/all", (req, res) => {
    const logs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100").all();
    res.json(logs);
  });

  // Reports and Statistics API
  app.post("/api/reports/sync", (req, res) => {
    try {
      syncReports(db);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/reports/summary", (req, res) => {
    try {
      const statusCounts = db.prepare(`
        SELECT 
          CASE 
            WHEN status = 'finished' AND case_status_v2 = 'منتهي فحص' THEN 'inspection_finished'
            WHEN status = 'finished' AND case_status_v2 = 'منتهي تحقيق' THEN 'investigation_finished'
            WHEN status = 'finished' AND case_status_v2 = 'منتهي محاكمة' THEN 'finished'
            ELSE status 
          END as status, 
          COUNT(*) as count 
        FROM cases 
        GROUP BY 1
      `).all();
      const inspectionResults = db.prepare("SELECT case_status_detail as result, COUNT(*) as count FROM cases WHERE case_status_v2 = 'منتهي فحص' GROUP BY case_status_detail").all();
      const investigationResults = db.prepare("SELECT case_status_detail as result, COUNT(*) as count FROM cases WHERE case_status_v2 = 'منتهي تحقيق' GROUP BY case_status_detail").all();
      const councilResults = db.prepare("SELECT case_status_detail as result, COUNT(*) as count FROM cases WHERE case_status_v2 = 'منتهي محاكمة' GROUP BY case_status_detail").all();
      
      res.json({
        statusCounts,
        inspectionResults,
        investigationResults,
        councilResults
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/reports/member-stats", (req, res) => {
    try {
      const stats = db.prepare(`
        SELECT 
          m.name as member_name,
          m.grade,
          m.seniority,
          COUNT(CASE WHEN t.task_type = 'فحص' THEN 1 END) as total_inspections,
          COUNT(CASE WHEN t.task_type = 'تحقيق' THEN 1 END) as total_investigations,
          COUNT(CASE WHEN t.task_type = 'فحص' AND t.task_status = 'منتهي' THEN 1 END) as finished_inspections,
          COUNT(CASE WHEN t.task_type = 'تحقيق' AND t.task_status = 'منتهي' THEN 1 END) as finished_investigations
        FROM prosecution_members m
        LEFT JOIN reports_tracking t ON m.name = t.member_name
        WHERE m.prosecution_office LIKE '%التفتيش%'
        GROUP BY m.name
        ORDER BY m.grade_order ASC, m.seniority ASC
      `).all();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/reports/member/:name/details", (req, res) => {
    try {
      const name = req.params.name;
      const inspections = db.prepare("SELECT * FROM reports_tracking WHERE member_name = ? AND task_type = 'فحص'").all(name);
      const investigations = db.prepare("SELECT * FROM reports_tracking WHERE member_name = ? AND task_type = 'تحقيق'").all(name);
      const objectionsMember3 = db.prepare("SELECT * FROM reports_tracking WHERE member_name = ? AND task_type = 'اعتراض' AND member_role = 'عضو3'").all(name);
      const allObjections = db.prepare("SELECT * FROM reports_tracking WHERE member_name = ? AND task_type = 'اعتراض'").all(name);
      
      res.json({ inspections, investigations, objectionsMember3, allObjections });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/audit/:caseId", (req, res) => {
    const logs = db.prepare("SELECT * FROM audit_logs WHERE record_id = ? AND table_name = 'cases' ORDER BY timestamp DESC").all(req.params.caseId);
    res.json(logs);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

function syncReports(db: any) {
  const transaction = db.transaction(() => {
    // Clear existing tracking
    db.prepare("DELETE FROM reports_tracking").run();

    // 1. Sync Inspections (Immediate/Section)
    const inspections = db.prepare(`
      SELECT i.*, m.name as member_name, c.incoming_date, c.case_status_v2, c.status as case_status
      FROM inspections i
      JOIN prosecution_members m ON i.inspector_id = m.id
      JOIN cases c ON i.case_id = c.id
      WHERE i.result NOT LIKE '%ضم إلى فحص%' OR i.result IS NULL
    `).all();

    // 1.5 Sync "فحص وعرض" tasks from cases
    const examinerTasks = db.prepare(`
      SELECT c.id, c.incoming_number, 'وارد' as record_year, m.name as member_name, c.incoming_date, c.status, c.case_status_v2
      FROM cases c
      JOIN prosecution_members m ON c.examiner_id = m.id
      WHERE c.decision = 'فحص وعرض'
    `).all();

    const finishedInspectionResults = ['حفظ', 'ملحوظة', 'إحالة', 'ضم', 'منتهي'];
    
    for (const insp of inspections) {
      const isFinished = insp.case_status_v2?.includes('منتهي') || 
                        insp.case_status === 'inspection_finished' ||
                        insp.case_status === 'finished' ||
                        finishedInspectionResults.some(r => insp.result?.includes(r));
      db.prepare(`
        INSERT OR IGNORE INTO reports_tracking (
          task_type, record_number, record_year, member_name, member_role, 
          assignment_date, task_status, source_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'فحص', insp.inspection_number, insp.year, insp.member_name, 'فاحص',
        insp.referral_date || insp.incoming_date,
        isFinished ? 'منتهي' : 'متداول',
        insp.id
      );

      // Sync internal objections from inspection details
      if (insp.details) {
        try {
          const details = JSON.parse(insp.details);
          const members = details.members || [];
          for (const member of members) {
            // Sync referral investigations
            if (member.result === 'احالة الى التحقيق') {
              const referrals = member.referral_investigations || [];
              for (const ref of referrals) {
                if (ref.number && ref.investigator_id) {
                  const invInfo = db.prepare("SELECT name FROM prosecution_members WHERE id = ?").get(ref.investigator_id);
                  if (invInfo) {
                    const isFinished = insp.case_status_v2?.includes('منتهي') || 
                                      insp.case_status === 'finished' ||
                                      ['حفظ', 'ملحوظة', 'تنبيه', 'مجلس', 'ضم', 'منتهي'].some(r => ref.result?.includes(r));
                    db.prepare(`
                      INSERT OR IGNORE INTO reports_tracking (
                        task_type, record_number, record_year, member_name, member_role, 
                        task_status, source_id
                      ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(
                      'تحقيق', ref.number, ref.year, invInfo.name, 'محقق',
                      isFinished ? 'منتهي' : 'متداول',
                      insp.id
                    );
                  }
                }
              }
            }

            if (member.has_objection && member.objection_number) {
              const committee = [
                { id: member.objection_committee_1, role: 'عضو1' },
                { id: member.objection_committee_2, role: 'عضو2' },
                { id: member.objection_committee_3, role: 'عضو3' }
              ];
              for (const cMember of committee) {
                if (cMember.id) {
                  const mInfo = db.prepare("SELECT name FROM prosecution_members WHERE id = ?").get(cMember.id);
                  if (mInfo) {
                    db.prepare(`
                      INSERT OR IGNORE INTO reports_tracking (
                        task_type, record_number, record_year, member_name, member_role, 
                        task_status, source_id
                      ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(
                      'اعتراض', member.objection_number, member.objection_year || insp.year, mInfo.name, cMember.role,
                      member.objection_result ? 'منتهي' : 'متداول',
                      insp.id
                    );
                  }
                }
              }
            }
          }
        } catch (e) {}
      }
    }

    for (const task of examinerTasks) {
      const isFinished = task.status === 'finished' || 
                        task.status === 'inspection_finished' || 
                        task.status === 'investigation_finished' ||
                        task.case_status_v2?.includes('منتهي');
      db.prepare(`
        INSERT OR IGNORE INTO reports_tracking (
          task_type, record_number, record_year, member_name, member_role, 
          assignment_date, task_status, source_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'فحص', task.incoming_number, task.record_year, task.member_name, 'فاحص',
        task.incoming_date,
        isFinished ? 'منتهي' : 'متداول',
        task.id
      );
    }

    // 2. Sync Investigations & Internal Objections
    const investigations = db.prepare(`
      SELECT inv.*, m.name as member_name, c.incoming_date, c.case_status_v2, c.status as case_status
      FROM investigations inv
      JOIN prosecution_members m ON inv.investigator_id = m.id
      JOIN cases c ON inv.case_id = c.id
      WHERE inv.result NOT LIKE '%ضم إلى تحقيق%' OR inv.result IS NULL
    `).all();

    const finishedInvestigationResults = ['حفظ', 'ملحوظة', 'تنبيه', 'مجلس', 'ضم', 'منتهي'];

    for (const inv of investigations) {
      const isFinished = inv.case_status_v2?.includes('منتهي') || 
                        inv.case_status === 'investigation_finished' ||
                        inv.case_status === 'finished' ||
                        finishedInvestigationResults.some(r => inv.result?.includes(r));
      
      let invReferralDate = inv.incoming_date;
      if (inv.referral_details) {
        try {
          const details = JSON.parse(inv.referral_details);
          if (details.referral_date) invReferralDate = details.referral_date;
        } catch (e) {}
      }

      db.prepare(`
        INSERT OR IGNORE INTO reports_tracking (
          task_type, record_number, record_year, member_name, member_role, 
          assignment_date, task_status, source_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'تحقيق', inv.investigation_number, inv.year, inv.member_name, 'محقق',
        invReferralDate,
        isFinished ? 'منتهي' : 'متداول',
        inv.id
      );

      // Sync internal objections from investigation referral_details
      if (inv.referral_details) {
        try {
          const refDetails = JSON.parse(inv.referral_details);
          const members = refDetails.members || [];
          for (const member of members) {
            if (member.has_objection && member.objection_number) {
              const committee = [
                { id: member.objection_committee_1, role: 'عضو1' },
                { id: member.objection_committee_2, role: 'عضو2' },
                { id: member.objection_committee_3, role: 'عضو3' }
              ];
              for (const cMember of committee) {
                if (cMember.id) {
                  const mInfo = db.prepare("SELECT name FROM prosecution_members WHERE id = ?").get(cMember.id);
                  if (mInfo) {
                    db.prepare(`
                      INSERT OR IGNORE INTO reports_tracking (
                        task_type, record_number, record_year, member_name, member_role, 
                        task_status, source_id
                      ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(
                      'اعتراض', member.objection_number, member.objection_year || inv.year, mInfo.name, cMember.role,
                      member.objection_result ? 'منتهي' : 'متداول',
                      inv.id
                    );
                  }
                }
              }
            }
          }
        } catch (e) {}
      }
    }
  });
  transaction();
}

startServer();
