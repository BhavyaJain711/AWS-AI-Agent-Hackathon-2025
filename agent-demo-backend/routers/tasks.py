from fastapi import APIRouter, HTTPException
from typing import List, Optional
import crud
from models import (
    Task, TaskCreate, TaskUpdate, TaskFilters,
    BulkStatusUpdate, TaskDependency, WorkloadAnalysis,
    Status
)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.post("", response_model=Task)
@router.post("/", response_model=Task)
def create_task(task: TaskCreate):
    """Create a new task"""
    return crud.create_task(task)


@router.post("/bulk", response_model=List[Task])
def bulk_create_tasks(tasks: List[TaskCreate]):
    """Create multiple tasks at once"""
    created_tasks = []
    for task in tasks:
        created_task = crud.create_task(task)
        created_tasks.append(created_task)
    return created_tasks


@router.get("", response_model=List[Task])
@router.get("/", response_model=List[Task])
def get_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    tag: Optional[str] = None,
    due_today: Optional[bool] = None,
    overdue: Optional[bool] = None
):
    """Get all tasks with optional filters"""
    filters = TaskFilters(
        status=status,
        priority=priority,
        tag=tag,
        due_today=due_today,
        overdue=overdue
    )
    return crud.get_tasks(filters)


@router.get("/{task_id}", response_model=Task)
def get_task(task_id: int):
    """Get a specific task by ID"""
    task = crud.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=Task)
def update_task(task_id: int, task_update: TaskUpdate):
    """Update a task"""
    task = crud.update_task(task_id, task_update)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.delete("/{task_id}")
def delete_task(task_id: int):
    """Delete a task"""
    success = crud.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}


@router.post("/{task_id}/complete", response_model=Task)
def complete_task(task_id: int):
    """Mark a task as completed"""
    from models import Status
    task = crud.update_task(task_id, TaskUpdate(status=Status.COMPLETED))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/{task_id}/tags")
def add_tag(task_id: int, tag: str):
    """Add a tag to a task"""
    task = crud.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    crud.add_task_tag(task_id, tag)
    return {"message": "Tag added successfully"}


@router.post("/{task_id}/dependencies")
def add_dependency(task_id: int, dependency: TaskDependency):
    """Add a dependency to a task"""
    success = crud.add_task_dependency(dependency.task_id, dependency.depends_on_task_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add dependency")
    return {"message": "Dependency added successfully"}


@router.post("/bulk/status")
def bulk_update_status(update: BulkStatusUpdate):
    """Update status for multiple tasks"""
    count = crud.bulk_update_status(update.task_ids, update.status)
    return {"message": f"Updated {count} tasks"}


@router.get("/stats/workload", response_model=WorkloadAnalysis)
def get_workload_analysis():
    """Get workload analysis and statistics"""
    stats = crud.get_workload_stats()
    
    # Calculate completion rate
    total = stats['total_tasks']
    completed = stats.get('completed_today', 0)
    completion_rate = (completed / total * 100) if total > 0 else 0
    
    # Generate insights
    insights = []
    if stats['overdue_tasks'] > 0:
        insights.append(f"You have {stats['overdue_tasks']} overdue tasks")
    if stats['total_estimated_hours'] > 8:
        insights.append(f"Your workload is {stats['total_estimated_hours']} hours - consider prioritizing")
    if stats['tasks_by_priority'].get('urgent', 0) > 3:
        insights.append("You have multiple urgent tasks - focus on these first")
    if completion_rate > 50:
        insights.append("Great progress today! Keep it up!")
    
    return WorkloadAnalysis(
        total_tasks=total,
        pending_tasks=stats['pending_tasks'],
        in_progress_tasks=stats['in_progress_tasks'],
        completed_today=completed,
        overdue_tasks=stats['overdue_tasks'],
        total_estimated_hours=stats['total_estimated_hours'],
        tasks_by_priority=stats['tasks_by_priority'],
        completion_rate=round(completion_rate, 1),
        insights=insights
    )


@router.post("/{task_id}/start")
def start_task(task_id: int):
    """Start working on a task (starts time tracking)"""
    task = crud.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Start time session
    session_id = crud.start_time_session(task_id)
    
    # Update task status
    crud.update_task(task_id, TaskUpdate(status=Status.IN_PROGRESS))
    
    return {
        "message": "Task started",
        "session_id": session_id,
        "task": crud.get_task(task_id)
    }


@router.post("/{task_id}/pause")
def pause_task(task_id: int):
    """Pause working on a task (ends time tracking)"""
    task = crud.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # End time session
    duration = crud.end_time_session(task_id)
    
    # Update task status
    crud.update_task(task_id, TaskUpdate(status=Status.PENDING))
    
    return {
        "message": "Task paused",
        "duration_minutes": duration,
        "task": crud.get_task(task_id)
    }


@router.get("/{task_id}/time-sessions")
def get_task_time_sessions(task_id: int):
    """Get time tracking sessions for a task"""
    task = crud.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    sessions = crud.get_task_time_sessions(task_id)
    return {
        "task_id": task_id,
        "sessions": sessions,
        "total_tracked_minutes": task.actual_minutes or 0
    }


@router.get("/stats/time-analytics")
def get_time_analytics():
    """Get time tracking analytics"""
    return crud.get_time_analytics()
