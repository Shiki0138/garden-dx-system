"""
Garden Process Management API
工程管理・工程表作成機能のバックエンドAPI

Created by: worker2 (Version Up - Process Management)
Date: 2025-07-01
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from pydantic import BaseModel, Field
import json

# Pydantic Models
class ProcessTask(BaseModel):
    id: int
    name: str
    description: str
    start_date: date
    end_date: date
    duration: float  # days
    progress: int = Field(ge=0, le=100)  # percentage
    category: str
    dependencies: List[int] = []
    assigned_to: str = ""
    status: str = "planned"  # planned, in_progress, completed, delayed, cancelled
    priority: str = "medium"  # low, medium, high, critical

class ProcessSchedule(BaseModel):
    id: int
    project_id: int
    name: str
    description: str
    start_date: date
    end_date: date
    tasks: List[ProcessTask]
    template_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ProcessScheduleCreateRequest(BaseModel):
    project_id: int
    name: str
    description: str
    start_date: date
    template_id: Optional[str] = None
    tasks: List[Dict[str, Any]] = []

class ProcessScheduleUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    tasks: Optional[List[ProcessTask]] = None

class ProcessTaskCreateRequest(BaseModel):
    name: str
    description: str
    start_date: date
    end_date: date
    duration: float
    category: str
    assigned_to: Optional[str] = ""
    priority: Optional[str] = "medium"
    dependencies: Optional[List[int]] = []

class ProcessTaskUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration: Optional[float] = None
    progress: Optional[int] = None
    category: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    dependencies: Optional[List[int]] = None

# 造園業特化の工程テンプレート
LANDSCAPING_PROCESS_TEMPLATES = {
    "garden-basic": {
        "id": "garden-basic",
        "name": "基本造園工事",
        "description": "一般的な庭園工事の標準工程",
        "tasks": [
            {"name": "現地調査・測量", "duration": 1, "dependencies": [], "category": "survey"},
            {"name": "設計・プラン作成", "duration": 3, "dependencies": [0], "category": "design"},
            {"name": "資材調達・発注", "duration": 2, "dependencies": [1], "category": "procurement"},
            {"name": "既存撤去・整地", "duration": 2, "dependencies": [2], "category": "demolition"},
            {"name": "基礎工事・排水", "duration": 3, "dependencies": [3], "category": "foundation"},
            {"name": "植栽工事", "duration": 4, "dependencies": [4], "category": "planting"},
            {"name": "外構・装飾工事", "duration": 3, "dependencies": [4], "category": "decoration"},
            {"name": "仕上げ・清掃", "duration": 1, "dependencies": [5, 6], "category": "finishing"},
            {"name": "検査・引き渡し", "duration": 1, "dependencies": [7], "category": "delivery"}
        ]
    },
    "maintenance": {
        "id": "maintenance",
        "name": "定期メンテナンス",
        "description": "庭園の定期メンテナンス工程",
        "tasks": [
            {"name": "現状確認・診断", "duration": 0.5, "dependencies": [], "category": "survey"},
            {"name": "剪定・刈り込み", "duration": 1, "dependencies": [0], "category": "maintenance"},
            {"name": "除草・施肥", "duration": 1, "dependencies": [0], "category": "maintenance"},
            {"name": "設備点検・修理", "duration": 0.5, "dependencies": [0], "category": "maintenance"},
            {"name": "清掃・整理", "duration": 0.5, "dependencies": [1, 2, 3], "category": "finishing"}
        ]
    },
    "large-project": {
        "id": "large-project",
        "name": "大規模造園プロジェクト",
        "description": "公園・大型施設等の造園工事",
        "tasks": [
            {"name": "企画・基本設計", "duration": 7, "dependencies": [], "category": "design"},
            {"name": "詳細設計・図面作成", "duration": 14, "dependencies": [0], "category": "design"},
            {"name": "許可申請・承認", "duration": 14, "dependencies": [1], "category": "legal"},
            {"name": "資材・重機調達", "duration": 7, "dependencies": [2], "category": "procurement"},
            {"name": "仮設工事・安全対策", "duration": 3, "dependencies": [3], "category": "preparation"},
            {"name": "土工・造成工事", "duration": 21, "dependencies": [4], "category": "foundation"},
            {"name": "給排水・電気工事", "duration": 14, "dependencies": [5], "category": "infrastructure"},
            {"name": "植栽・緑化工事", "duration": 28, "dependencies": [6], "category": "planting"},
            {"name": "外構・景観工事", "duration": 21, "dependencies": [6], "category": "decoration"},
            {"name": "最終仕上げ・検査", "duration": 7, "dependencies": [7, 8], "category": "finishing"}
        ]
    }
}

# Mock データベース（実際の実装では本物のDBを使用）
mock_schedules: Dict[int, ProcessSchedule] = {}
mock_schedule_counter = 1

# APIルーター
router = APIRouter(prefix="/api/process", tags=["process-management"])

@router.get("/templates")
async def get_process_templates():
    """工程テンプレート一覧取得"""
    return {
        "templates": list(LANDSCAPING_PROCESS_TEMPLATES.values()),
        "status": "success"
    }

@router.get("/templates/{template_id}")
async def get_process_template(template_id: str):
    """特定の工程テンプレート取得"""
    if template_id not in LANDSCAPING_PROCESS_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {
        "template": LANDSCAPING_PROCESS_TEMPLATES[template_id],
        "status": "success"
    }

@router.post("/schedules")
async def create_process_schedule(request: ProcessScheduleCreateRequest):
    """工程表作成"""
    global mock_schedule_counter
    
    # テンプレートから自動生成
    tasks = []
    if request.template_id and request.template_id in LANDSCAPING_PROCESS_TEMPLATES:
        template = LANDSCAPING_PROCESS_TEMPLATES[request.template_id]
        start_date = request.start_date
        
        for i, task_template in enumerate(template["tasks"]):
            # 依存関係を考慮して開始日を計算
            task_start_date = start_date
            if task_template["dependencies"]:
                max_dependency_end = start_date
                for dep_index in task_template["dependencies"]:
                    if dep_index < len(template["tasks"]):
                        dep_task = template["tasks"][dep_index]
                        dep_end = start_date + timedelta(days=sum(
                            template["tasks"][j]["duration"] for j in range(dep_index + 1)
                        ))
                        if dep_end > max_dependency_end:
                            max_dependency_end = dep_end
                task_start_date = max_dependency_end
            else:
                # 前のタスクの開始日からのオフセット
                if i > 0:
                    task_start_date = start_date + timedelta(days=i)
            
            task_end_date = task_start_date + timedelta(days=task_template["duration"])
            
            task = ProcessTask(
                id=i + 1,
                name=task_template["name"],
                description=f"{task_template['name']}の作業",
                start_date=task_start_date,
                end_date=task_end_date,
                duration=task_template["duration"],
                progress=0,
                category=task_template["category"],
                dependencies=task_template["dependencies"],
                assigned_to="",
                status="planned",
                priority="medium"
            )
            tasks.append(task)
    
    # カスタムタスクを追加
    for task_data in request.tasks:
        task = ProcessTask(**task_data)
        tasks.append(task)
    
    # 工程表作成
    end_date = request.start_date
    if tasks:
        end_date = max(task.end_date for task in tasks)
    
    schedule = ProcessSchedule(
        id=mock_schedule_counter,
        project_id=request.project_id,
        name=request.name,
        description=request.description,
        start_date=request.start_date,
        end_date=end_date,
        tasks=tasks,
        template_id=request.template_id,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    mock_schedules[mock_schedule_counter] = schedule
    mock_schedule_counter += 1
    
    return {
        "schedule": schedule,
        "status": "success",
        "message": "工程表が作成されました"
    }

@router.get("/projects/{project_id}/schedule")
async def get_project_schedule(project_id: int):
    """プロジェクトの工程表取得"""
    for schedule in mock_schedules.values():
        if schedule.project_id == project_id:
            return {
                "schedule": schedule,
                "status": "success"
            }
    
    raise HTTPException(status_code=404, detail="Schedule not found")

@router.put("/projects/{project_id}/schedule")
async def update_project_schedule(
    project_id: int, 
    request: ProcessScheduleUpdateRequest
):
    """プロジェクトの工程表更新"""
    schedule = None
    for s in mock_schedules.values():
        if s.project_id == project_id:
            schedule = s
            break
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # 更新処理
    if request.name is not None:
        schedule.name = request.name
    if request.description is not None:
        schedule.description = request.description
    if request.start_date is not None:
        schedule.start_date = request.start_date
    if request.end_date is not None:
        schedule.end_date = request.end_date
    if request.tasks is not None:
        schedule.tasks = request.tasks
        # 終了日を再計算
        if schedule.tasks:
            schedule.end_date = max(task.end_date for task in schedule.tasks)
    
    schedule.updated_at = datetime.now()
    
    return {
        "schedule": schedule,
        "status": "success",
        "message": "工程表が更新されました"
    }

@router.post("/schedules/{schedule_id}/tasks")
async def create_process_task(
    schedule_id: int,
    request: ProcessTaskCreateRequest
):
    """工程にタスクを追加"""
    schedule = mock_schedules.get(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # 新しいタスクID生成
    max_task_id = max([task.id for task in schedule.tasks], default=0)
    new_task_id = max_task_id + 1
    
    new_task = ProcessTask(
        id=new_task_id,
        name=request.name,
        description=request.description,
        start_date=request.start_date,
        end_date=request.end_date,
        duration=request.duration,
        progress=0,
        category=request.category,
        dependencies=request.dependencies or [],
        assigned_to=request.assigned_to or "",
        status="planned",
        priority=request.priority or "medium"
    )
    
    schedule.tasks.append(new_task)
    schedule.updated_at = datetime.now()
    
    # 終了日を再計算
    if schedule.tasks:
        schedule.end_date = max(task.end_date for task in schedule.tasks)
    
    return {
        "task": new_task,
        "schedule": schedule,
        "status": "success",
        "message": "タスクが追加されました"
    }

@router.put("/schedules/{schedule_id}/tasks/{task_id}")
async def update_process_task(
    schedule_id: int,
    task_id: int,
    request: ProcessTaskUpdateRequest
):
    """工程のタスクを更新"""
    schedule = mock_schedules.get(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    task = None
    for t in schedule.tasks:
        if t.id == task_id:
            task = t
            break
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # 更新処理
    if request.name is not None:
        task.name = request.name
    if request.description is not None:
        task.description = request.description
    if request.start_date is not None:
        task.start_date = request.start_date
    if request.end_date is not None:
        task.end_date = request.end_date
    if request.duration is not None:
        task.duration = request.duration
    if request.progress is not None:
        task.progress = request.progress
    if request.category is not None:
        task.category = request.category
    if request.assigned_to is not None:
        task.assigned_to = request.assigned_to
    if request.status is not None:
        task.status = request.status
    if request.priority is not None:
        task.priority = request.priority
    if request.dependencies is not None:
        task.dependencies = request.dependencies
    
    schedule.updated_at = datetime.now()
    
    # 終了日を再計算
    if schedule.tasks:
        schedule.end_date = max(task.end_date for task in schedule.tasks)
    
    return {
        "task": task,
        "schedule": schedule,
        "status": "success",
        "message": "タスクが更新されました"
    }

@router.delete("/schedules/{schedule_id}/tasks/{task_id}")
async def delete_process_task(schedule_id: int, task_id: int):
    """工程のタスクを削除"""
    schedule = mock_schedules.get(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    original_count = len(schedule.tasks)
    schedule.tasks = [task for task in schedule.tasks if task.id != task_id]
    
    if len(schedule.tasks) == original_count:
        raise HTTPException(status_code=404, detail="Task not found")
    
    schedule.updated_at = datetime.now()
    
    # 終了日を再計算
    if schedule.tasks:
        schedule.end_date = max(task.end_date for task in schedule.tasks)
    else:
        schedule.end_date = schedule.start_date
    
    return {
        "schedule": schedule,
        "status": "success",
        "message": "タスクが削除されました"
    }

@router.get("/schedules/{schedule_id}/report")
async def get_progress_report(schedule_id: int):
    """進捗レポート取得"""
    schedule = mock_schedules.get(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # 進捗統計計算
    total_tasks = len(schedule.tasks)
    completed_tasks = len([task for task in schedule.tasks if task.status == "completed"])
    delayed_tasks = len([task for task in schedule.tasks if task.status == "delayed"])
    
    overall_progress = 0
    if total_tasks > 0:
        overall_progress = sum(task.progress for task in schedule.tasks) // total_tasks
    
    # カテゴリ別進捗
    category_stats = {}
    for task in schedule.tasks:
        if task.category not in category_stats:
            category_stats[task.category] = {"tasks": [], "progress": 0}
        category_stats[task.category]["tasks"].append(task)
    
    category_progress = []
    for category, stats in category_stats.items():
        tasks_count = len(stats["tasks"])
        category_avg_progress = sum(task.progress for task in stats["tasks"]) // tasks_count if tasks_count > 0 else 0
        category_progress.append({
            "category": category,
            "progress": category_avg_progress,
            "tasks_count": tasks_count
        })
    
    report = {
        "schedule_id": schedule_id,
        "project_id": schedule.project_id,
        "overall_progress": overall_progress,
        "completed_tasks": completed_tasks,
        "total_tasks": total_tasks,
        "delayed_tasks": delayed_tasks,
        "critical_path_delay": 0,  # 簡略化
        "estimated_completion": schedule.end_date.isoformat(),
        "category_progress": category_progress,
        "generated_at": datetime.now().isoformat()
    }
    
    return {
        "report": report,
        "status": "success"
    }

@router.get("/categories")
async def get_process_categories():
    """工程カテゴリ一覧取得"""
    categories = {
        "survey": "現地調査・測量",
        "design": "設計・プラン作成",
        "procurement": "資材調達・発注",
        "demolition": "既存撤去・整地",
        "foundation": "基礎工事・排水",
        "planting": "植栽工事",
        "decoration": "外構・装飾工事",
        "finishing": "仕上げ・清掃",
        "delivery": "検査・引き渡し",
        "maintenance": "メンテナンス",
        "legal": "許可申請・承認",
        "preparation": "仮設工事・安全対策",
        "infrastructure": "給排水・電気工事"
    }
    
    return {
        "categories": categories,
        "status": "success"
    }