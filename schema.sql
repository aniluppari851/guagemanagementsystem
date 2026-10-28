CREATE TABLE IF NOT EXISTS gauges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nws_gauge_no TEXT UNIQUE NOT NULL,
    gauge_no TEXT,
    description TEXT,
    specification TEXT,
    least_count TEXT,
    mfg_no TEXT,
    mfg_sno TEXT,
    keeping_dept TEXT,
    location TEXT,
    placement TEXT,
    model TEXT,
    country TEXT DEFAULT 'India',
    measurement TEXT,
    display TEXT,
    method TEXT,
    gauge_type TEXT,
    basis TEXT,
    category TEXT,
    received_date DATE,
    status TEXT DEFAULT 'Accept',
    note TEXT,
    cal_cycle_months INTEGER DEFAULT 12,
    last_cal_date DATE,
    next_due_date DATE,
    drawing_file TEXT,
    drawing_title TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS calibration_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gauge_id INTEGER,
    plan_date DATE,
    sent_date DATETIME,
    received_date DATETIME,
    completed_date DATETIME,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Sent', 'Received', 'Completed', 'Rejected'
    calibrated_by TEXT,
    time_diff_hours REAL,
    remarks TEXT,
    certificate_no TEXT,
    agency TEXT DEFAULT 'Internal Lab',
    result TEXT DEFAULT 'Pass',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(gauge_id) REFERENCES gauges(id)
);

CREATE TABLE IF NOT EXISTS drawings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gauge_id INTEGER,
    doc_number TEXT,
    title TEXT,
    revision TEXT,
    file_path TEXT,
    spec_notes TEXT,
    dimensions TEXT,
    uploaded_by TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(gauge_id) REFERENCES gauges(id)
);
