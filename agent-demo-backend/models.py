from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Status(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class TaskType(str, Enum):
    SIMPLE = "simple"
    RESEARCH = "research"
    PROJECT = "project"
    RECURRING = "recurring"


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    task_type: TaskType = TaskType.SIMPLE
    due_date: Optional[str] = None
    estimated_minutes: Optional[int] = None
    tags: Optional[List[str]] = None
    parent_task_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[Status] = None
    task_type: Optional[TaskType] = None
    due_date: Optional[str] = None
    estimated_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None
    research_data: Optional[Dict[str, Any]] = None
    ai_insights: Optional[Dict[str, Any]] = None


class Task(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    notes: Optional[str] = None
    priority: Priority
    status: Status
    task_type: TaskType
    due_date: Optional[str] = None
    estimated_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None
    created_at: str
    updated_at: str
    completed_at: Optional[str] = None
    parent_task_id: Optional[int] = None
    research_data: Optional[Dict[str, Any]] = None
    ai_insights: Optional[Dict[str, Any]] = None
    tags: List[str] = []
    subtasks: List['Task'] = []
    dependencies: List[int] = []


class TaskFilters(BaseModel):
    status: Optional[Status] = None
    priority: Optional[Priority] = None
    tag: Optional[str] = None
    due_today: Optional[bool] = None
    overdue: Optional[bool] = None
    parent_task_id: Optional[int] = None


class BulkStatusUpdate(BaseModel):
    task_ids: List[int]
    status: Status


class TaskDependency(BaseModel):
    task_id: int
    depends_on_task_id: int


class DailyPlan(BaseModel):
    date: str
    tasks: List[Task]
    strategy: Optional[str] = None
    created_by_agent: Optional[str] = None


class WorkloadAnalysis(BaseModel):
    total_tasks: int
    pending_tasks: int
    in_progress_tasks: int
    completed_today: int
    overdue_tasks: int
    total_estimated_hours: float
    tasks_by_priority: Dict[str, int]
    completion_rate: float
    insights: List[str]
