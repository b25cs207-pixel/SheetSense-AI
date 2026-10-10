import sqlite3
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from backend.config import DB_PATH

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        filename TEXT NOT NULL,
        source_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        original_file_path TEXT,
        row_count INTEGER DEFAULT 0,
        col_count INTEGER DEFAULT 0,
        schema_json TEXT,
        quality_json TEXT,
        summary_json TEXT,
        domain TEXT DEFAULT 'auto',
        analysis_mode TEXT DEFAULT 'auto',
        custom_objective TEXT,
        version_count INTEGER DEFAULT 1,
        is_shared INTEGER DEFAULT 0,
        share_token TEXT UNIQUE,
        created_at TEXT NOT NULL
    );
    """)

    # Safe migration: ensure newly added columns exist in existing SQLite databases
    cursor.execute("PRAGMA table_info(datasets);")
    existing_cols = {row["name"] for row in cursor.fetchall()}
    
    if "original_file_path" not in existing_cols:
        cursor.execute("ALTER TABLE datasets ADD COLUMN original_file_path TEXT;")
    if "domain" not in existing_cols:
        cursor.execute("ALTER TABLE datasets ADD COLUMN domain TEXT DEFAULT 'auto';")
    if "analysis_mode" not in existing_cols:
        cursor.execute("ALTER TABLE datasets ADD COLUMN analysis_mode TEXT DEFAULT 'auto';")
    if "custom_objective" not in existing_cols:
        cursor.execute("ALTER TABLE datasets ADD COLUMN custom_objective TEXT;")
    if "version_count" not in existing_cols:
        cursor.execute("ALTER TABLE datasets ADD COLUMN version_count INTEGER DEFAULT 1;")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dataset_versions (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        change_summary TEXT NOT NULL,
        changes_json TEXT,
        row_count INTEGER DEFAULT 0,
        col_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        title TEXT NOT NULL,
        analysis_type TEXT NOT NULL,
        spec_json TEXT,
        result_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_history (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        role TEXT NOT NULL,
        message TEXT NOT NULL,
        chart_data_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
    );
    """)
    conn.commit()
    conn.close()

def save_dataset(dataset_dict: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO datasets (
            id, name, filename, source_type, file_path, original_file_path, row_count, col_count,
            schema_json, quality_json, summary_json, domain, analysis_mode, custom_objective,
            version_count, is_shared, share_token, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        dataset_dict["id"],
        dataset_dict["name"],
        dataset_dict["filename"],
        dataset_dict["source_type"],
        dataset_dict["file_path"],
        dataset_dict.get("original_file_path", dataset_dict["file_path"]),
        dataset_dict.get("row_count", 0),
        dataset_dict.get("col_count", 0),
        json.dumps(dataset_dict.get("schema", {})),
        json.dumps(dataset_dict.get("quality", {})),
        json.dumps(dataset_dict.get("summary", {})),
        dataset_dict.get("domain", "auto"),
        dataset_dict.get("analysis_mode", "auto"),
        dataset_dict.get("custom_objective", None),
        dataset_dict.get("version_count", 1),
        dataset_dict.get("is_shared", 0),
        dataset_dict.get("share_token"),
        dataset_dict.get("created_at", datetime.now(timezone.utc).isoformat())
    ))
    conn.commit()
    conn.close()

def get_dataset(dataset_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["schema"] = json.loads(d["schema_json"]) if d["schema_json"] else {}
    d["quality"] = json.loads(d["quality_json"]) if d["quality_json"] else {}
    d["summary"] = json.loads(d["summary_json"]) if d["summary_json"] else {}
    return d

def get_dataset_by_share_token(token: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM datasets WHERE share_token = ? AND is_shared = 1", (token,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["schema"] = json.loads(d["schema_json"]) if d["schema_json"] else {}
    d["quality"] = json.loads(d["quality_json"]) if d["quality_json"] else {}
    d["summary"] = json.loads(d["summary_json"]) if d["summary_json"] else {}
    return d

def list_datasets() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, filename, source_type, row_count, col_count, domain, analysis_mode,
               version_count, is_shared, share_token, created_at 
        FROM datasets ORDER BY created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_dataset(dataset_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def save_dataset_version(dataset_id: str, version_number: int, file_path: str, change_summary: str, changes: list = None, row_count: int = 0, col_count: int = 0):
    conn = get_connection()
    cursor = conn.cursor()
    ver_id = f"ver_{uuid.uuid4().hex[:10]}"
    cursor.execute("""
        INSERT INTO dataset_versions (id, dataset_id, version_number, file_path, change_summary, changes_json, row_count, col_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        ver_id,
        dataset_id,
        version_number,
        file_path,
        change_summary,
        json.dumps(changes or []),
        row_count,
        col_count,
        datetime.now(timezone.utc).isoformat()
    ))
    cursor.execute("UPDATE datasets SET version_count = MAX(version_count, ?) WHERE id = ?", (version_number, dataset_id))
    conn.commit()
    conn.close()
    return ver_id

def get_dataset_versions(dataset_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM dataset_versions WHERE dataset_id = ? ORDER BY version_number DESC", (dataset_id,))
    rows = cursor.fetchall()
    conn.close()
    results = []
    for r in rows:
        d = dict(r)
        d["changes"] = json.loads(d["changes_json"]) if d["changes_json"] else []
        results.append(d)
    return results

def get_dataset_version(dataset_id: str, version_number: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM dataset_versions WHERE dataset_id = ? AND version_number = ?", (dataset_id, version_number))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["changes"] = json.loads(d["changes_json"]) if d["changes_json"] else []
    return d

def update_dataset_domain(dataset_id: str, domain: str, analysis_mode: str = "industry", custom_objective: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE datasets 
        SET domain = ?, analysis_mode = ?, custom_objective = ?
        WHERE id = ?
    """, (domain, analysis_mode, custom_objective, dataset_id))
    conn.commit()
    conn.close()

def save_chat_message(dataset_id: str, role: str, message: str, chart_data: Optional[Dict[str, Any]] = None):
    conn = get_connection()
    cursor = conn.cursor()
    msg_id = f"msg_{datetime.now(timezone.utc).timestamp()}"
    cursor.execute("""
        INSERT INTO chat_history (id, dataset_id, role, message, chart_data_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        msg_id,
        dataset_id,
        role,
        message,
        json.dumps(chart_data) if chart_data else None,
        datetime.now(timezone.utc).isoformat()
    ))
    conn.commit()
    conn.close()

def get_chat_history(dataset_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, role, message, chart_data_json, created_at FROM chat_history WHERE dataset_id = ? ORDER BY created_at ASC", (dataset_id,))
    rows = cursor.fetchall()
    conn.close()
    results = []
    for r in rows:
        item = dict(r)
        item["chart_data"] = json.loads(item["chart_data_json"]) if item["chart_data_json"] else None
        results.append(item)
    return results

def update_share_status(dataset_id: str, is_shared: bool, token: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE datasets SET is_shared = ?, share_token = ? WHERE id = ?", (1 if is_shared else 0, token, dataset_id))
    conn.commit()
    conn.close()
