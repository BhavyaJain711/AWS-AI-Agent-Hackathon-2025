import sqlite3
from contextlib import contextmanager
from datetime import datetime
import json

DATABASE_PATH = "tasks.db"


@contextmanager
def get_db():
    """Context manager for database connections"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Initialize database with schema"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Tasks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                notes TEXT,
                priority TEXT DEFAULT 'medium',
                status TEXT DEFAULT 'pending',
                task_type TEXT DEFAULT 'simple',
                due_date TEXT,
                estimated_minutes INTEGER,
                actual_minutes INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed_at TEXT,
                parent_task_id INTEGER,
                research_data TEXT,
                ai_insights TEXT,
                FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )
        """)
        
        # Task dependencies table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS task_dependencies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                depends_on_task_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                UNIQUE(task_id, depends_on_task_id)
            )
        """)
        
        # Task tags table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS task_tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                tag TEXT NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )
        """)
        
        # Daily plans table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL UNIQUE,
                tasks_json TEXT NOT NULL,
                strategy TEXT,
                created_by_agent TEXT,
                created_at TEXT NOT NULL
            )
        """)
        
        # Time tracking table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS time_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                duration_minutes INTEGER,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_time_sessions_task ON time_sessions(task_id)")
        
        conn.commit()
        print("[Database] Initialized successfully")


# Initialize database on module import
init_db()
