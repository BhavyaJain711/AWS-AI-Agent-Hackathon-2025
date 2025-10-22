from database import get_db
from models import Task, TaskCreate, TaskUpdate, TaskFilters, Priority, Status
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
import json


def dict_from_row(row) -> dict:
    """Convert sqlite3.Row to dict"""
    return dict(row) if row else None


def task_from_row(row) -> Optional[Task]:
    """Convert database row to Task model"""
    if not row:
        return None
    
    data = dict_from_row(row)
    
    # Parse JSON fields
    if data.get('research_data'):
        data['research_data'] = json.loads(data['research_data'])
    if data.get('ai_insights'):
        data['ai_insights'] = json.loads(data['ai_insights'])
    
    # Get tags
    data['tags'] = get_task_tags(data['id'])
    
    # Get subtasks
    data['subtasks'] = get_subtasks(data['id'])
    
    # Get dependencies
    data['dependencies'] = get_task_dependencies(data['id'])
    
    return Task(**data)


def create_task(task: TaskCreate) -> Task:
    """Create a new task"""
    with get_db() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        cursor.execute("""
            INSERT INTO tasks (
                title, description, priority, task_type, due_date,
                estimated_minutes, created_at, updated_at, parent_task_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            task.title,
            task.description,
            task.priority.value,
            task.task_type.value,
            task.due_date,
            task.estimated_minutes,
            now,
            now,
            task.parent_task_id
        ))
        
        task_id = cursor.lastrowid
        
        # Add tags
        if task.tags:
            for tag in task.tags:
                cursor.execute(
                    "INSERT INTO task_tags (task_id, tag) VALUES (?, ?)",
                    (task_id, tag)
                )
        
        conn.commit()
        
        # Fetch and return the created task
        cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        return task_from_row(cursor.fetchone())


def get_task(task_id: int) -> Optional[Task]:
    """Get a task by ID"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        return task_from_row(cursor.fetchone())


def get_tasks(filters: Optional[TaskFilters] = None) -> List[Task]:
    """Get tasks with optional filters"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        query = "SELECT * FROM tasks WHERE 1=1"
        params = []
        
        if filters:
            if filters.status:
                query += " AND status = ?"
                params.append(filters.status.value)
            
            if filters.priority:
                query += " AND priority = ?"
                params.append(filters.priority.value)
            
            if filters.parent_task_id is not None:
                query += " AND parent_task_id = ?"
                params.append(filters.parent_task_id)
            elif filters.parent_task_id is None and not hasattr(filters, 'include_subtasks'):
                # By default, exclude subtasks
                query += " AND parent_task_id IS NULL"
            
            if filters.tag:
                query += """ AND id IN (
                    SELECT task_id FROM task_tags WHERE tag = ?
                )"""
                params.append(filters.tag)
            
            if filters.due_today:
                today = date.today().isoformat()
                query += " AND due_date = ?"
                params.append(today)
            
            if filters.overdue:
                today = date.today().isoformat()
                query += " AND due_date < ? AND status != 'completed'"
                params.append(today)
        else:
            # By default, exclude subtasks
            query += " AND parent_task_id IS NULL"
        
        query += " ORDER BY priority DESC, due_date ASC, created_at DESC"
        
        cursor.execute(query, params)
        return [task_from_row(row) for row in cursor.fetchall()]


def update_task(task_id: int, task_update: TaskUpdate) -> Optional[Task]:
    """Update a task"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Build update query dynamically
        updates = []
        params = []
        
        if task_update.title is not None:
            updates.append("title = ?")
            params.append(task_update.title)
        
        if task_update.description is not None:
            updates.append("description = ?")
            params.append(task_update.description)
        
        if task_update.notes is not None:
            updates.append("notes = ?")
            params.append(task_update.notes)
        
        if task_update.priority is not None:
            updates.append("priority = ?")
            params.append(task_update.priority.value)
        
        if task_update.status is not None:
            updates.append("status = ?")
            params.append(task_update.status.value)
            
            # Set completed_at if status is completed
            if task_update.status == Status.COMPLETED:
                updates.append("completed_at = ?")
                params.append(datetime.now().isoformat())
            # Clear completed_at if status is changed from completed to something else
            elif task_update.status != Status.COMPLETED:
                # Check if task was previously completed
                current_task = get_task(task_id)
                if current_task and current_task.status == 'completed':
                    updates.append("completed_at = ?")
                    params.append(None)
        
        if task_update.task_type is not None:
            updates.append("task_type = ?")
            params.append(task_update.task_type.value)
        
        if task_update.due_date is not None:
            updates.append("due_date = ?")
            params.append(task_update.due_date)
        
        if task_update.estimated_minutes is not None:
            updates.append("estimated_minutes = ?")
            params.append(task_update.estimated_minutes)
        
        if task_update.actual_minutes is not None:
            updates.append("actual_minutes = ?")
            params.append(task_update.actual_minutes)
        
        if task_update.research_data is not None:
            updates.append("research_data = ?")
            params.append(json.dumps(task_update.research_data))
        
        if task_update.ai_insights is not None:
            updates.append("ai_insights = ?")
            params.append(json.dumps(task_update.ai_insights))
        
        if not updates:
            return get_task(task_id)
        
        updates.append("updated_at = ?")
        params.append(datetime.now().isoformat())
        params.append(task_id)
        
        query = f"UPDATE tasks SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()
        
        return get_task(task_id)


def delete_task(task_id: int) -> bool:
    """Delete a task"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
        return cursor.rowcount > 0


def get_task_tags(task_id: int) -> List[str]:
    """Get tags for a task"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT tag FROM task_tags WHERE task_id = ?", (task_id,))
        return [row['tag'] for row in cursor.fetchall()]


def add_task_tag(task_id: int, tag: str):
    """Add a tag to a task"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO task_tags (task_id, tag) VALUES (?, ?)",
            (task_id, tag)
        )
        conn.commit()


def get_subtasks(task_id: int) -> List[Task]:
    """Get subtasks of a task"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY created_at",
            (task_id,)
        )
        return [task_from_row(row) for row in cursor.fetchall()]


def add_task_dependency(task_id: int, depends_on_task_id: int) -> bool:
    """Add a dependency between tasks"""
    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO task_dependencies (task_id, depends_on_task_id, created_at)
                VALUES (?, ?, ?)
            """, (task_id, depends_on_task_id, datetime.now().isoformat()))
            conn.commit()
            return True
        except:
            return False


def get_task_dependencies(task_id: int) -> List[int]:
    """Get task IDs that this task depends on"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT depends_on_task_id FROM task_dependencies WHERE task_id = ?",
            (task_id,)
        )
        return [row['depends_on_task_id'] for row in cursor.fetchall()]


def bulk_update_status(task_ids: List[int], status: Status) -> int:
    """Update status for multiple tasks"""
    with get_db() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        placeholders = ','.join('?' * len(task_ids))
        query = f"UPDATE tasks SET status = ?, updated_at = ?"
        params = [status.value, now]
        
        if status == Status.COMPLETED:
            query += ", completed_at = ?"
            params.append(now)
        
        query += f" WHERE id IN ({placeholders})"
        params.extend(task_ids)
        
        cursor.execute(query, params)
        conn.commit()
        return cursor.rowcount


def get_workload_stats() -> Dict[str, Any]:
    """Get workload statistics"""
    with get_db() as conn:
        cursor = conn.cursor()
        today = date.today().isoformat()
        
        # Total tasks
        cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE parent_task_id IS NULL")
        total_tasks = cursor.fetchone()['count']
        
        # By status
        cursor.execute("""
            SELECT status, COUNT(*) as count 
            FROM tasks 
            WHERE parent_task_id IS NULL
            GROUP BY status
        """)
        status_counts = {row['status']: row['count'] for row in cursor.fetchall()}
        
        # Completed today
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM tasks 
            WHERE DATE(completed_at) = ? AND parent_task_id IS NULL
        """, (today,))
        completed_today = cursor.fetchone()['count']
        
        # Overdue
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM tasks 
            WHERE due_date < ? AND status != 'completed' AND parent_task_id IS NULL
        """, (today,))
        overdue_tasks = cursor.fetchone()['count']
        
        # By priority
        cursor.execute("""
            SELECT priority, COUNT(*) as count 
            FROM tasks 
            WHERE status != 'completed' AND parent_task_id IS NULL
            GROUP BY priority
        """)
        priority_counts = {row['priority']: row['count'] for row in cursor.fetchall()}
        
        # Total estimated time
        cursor.execute("""
            SELECT SUM(estimated_minutes) as total 
            FROM tasks 
            WHERE status != 'completed' AND parent_task_id IS NULL
        """)
        total_minutes = cursor.fetchone()['total'] or 0
        
        return {
            'total_tasks': total_tasks,
            'pending_tasks': status_counts.get('pending', 0),
            'in_progress_tasks': status_counts.get('in_progress', 0),
            'completed_today': completed_today,
            'overdue_tasks': overdue_tasks,
            'total_estimated_hours': round(total_minutes / 60, 1),
            'tasks_by_priority': priority_counts
        }



def start_time_session(task_id: int) -> int:
    """Start a new time tracking session for a task"""
    with get_db() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        # End any existing open sessions for this task
        cursor.execute("""
            UPDATE time_sessions 
            SET ended_at = ?, duration_minutes = 
                CAST((julianday(?) - julianday(started_at)) * 24 * 60 AS INTEGER)
            WHERE task_id = ? AND ended_at IS NULL
        """, (now, now, task_id))
        
        # Start new session
        cursor.execute("""
            INSERT INTO time_sessions (task_id, started_at)
            VALUES (?, ?)
        """, (task_id, now))
        
        conn.commit()
        return cursor.lastrowid


def end_time_session(task_id: int) -> Optional[int]:
    """End the current time tracking session for a task"""
    with get_db() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        
        # Find and end the open session
        cursor.execute("""
            UPDATE time_sessions 
            SET ended_at = ?, duration_minutes = 
                CAST((julianday(?) - julianday(started_at)) * 24 * 60 AS INTEGER)
            WHERE task_id = ? AND ended_at IS NULL
        """, (now, now, task_id))
        
        if cursor.rowcount > 0:
            # Get the duration
            cursor.execute("""
                SELECT duration_minutes FROM time_sessions 
                WHERE task_id = ? AND ended_at = ?
            """, (task_id, now))
            result = cursor.fetchone()
            duration = result['duration_minutes'] if result else 0
            
            # Update task's actual_minutes
            cursor.execute("""
                UPDATE tasks 
                SET actual_minutes = COALESCE(actual_minutes, 0) + ?
                WHERE id = ?
            """, (duration, task_id))
            
            conn.commit()
            return duration
        
        return None


def get_task_time_sessions(task_id: int) -> List[Dict[str, Any]]:
    """Get all time sessions for a task"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, started_at, ended_at, duration_minutes
            FROM time_sessions
            WHERE task_id = ?
            ORDER BY started_at DESC
        """, (task_id,))
        
        return [dict_from_row(row) for row in cursor.fetchall()]


def get_time_analytics() -> Dict[str, Any]:
    """Get time tracking analytics"""
    with get_db() as conn:
        cursor = conn.cursor()
        today = date.today().isoformat()
        
        # Total time tracked today
        cursor.execute("""
            SELECT COALESCE(SUM(duration_minutes), 0) as total
            FROM time_sessions
            WHERE DATE(started_at) = ?
        """, (today,))
        time_today = cursor.fetchone()['total']
        
        # Total time tracked this week
        week_start = (date.today() - timedelta(days=date.today().weekday())).isoformat()
        cursor.execute("""
            SELECT COALESCE(SUM(duration_minutes), 0) as total
            FROM time_sessions
            WHERE DATE(started_at) >= ?
        """, (week_start,))
        time_this_week = cursor.fetchone()['total']
        
        # Currently active sessions
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM time_sessions
            WHERE ended_at IS NULL
        """)
        active_sessions = cursor.fetchone()['count']
        
        # Most worked on tasks today
        cursor.execute("""
            SELECT t.id, t.title, SUM(ts.duration_minutes) as total_minutes
            FROM time_sessions ts
            JOIN tasks t ON ts.task_id = t.id
            WHERE DATE(ts.started_at) = ?
            GROUP BY t.id, t.title
            ORDER BY total_minutes DESC
            LIMIT 5
        """, (today,))
        top_tasks_today = [dict_from_row(row) for row in cursor.fetchall()]
        
        # Average session length
        cursor.execute("""
            SELECT AVG(duration_minutes) as avg_duration
            FROM time_sessions
            WHERE ended_at IS NOT NULL AND DATE(started_at) = ?
        """, (today,))
        avg_session = cursor.fetchone()['avg_duration'] or 0
        
        return {
            'time_today_minutes': time_today,
            'time_today_hours': round(time_today / 60, 1),
            'time_this_week_minutes': time_this_week,
            'time_this_week_hours': round(time_this_week / 60, 1),
            'active_sessions': active_sessions,
            'top_tasks_today': top_tasks_today,
            'avg_session_minutes': round(avg_session, 1)
        }
