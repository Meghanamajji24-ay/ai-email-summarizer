from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.auth import get_current_user
from app.db.mongodb import get_database
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut, TaskListResponse

router = APIRouter(prefix="/actions", tags=["Action Items"])

def doc_to_task_out(doc: dict) -> TaskOut:
    return TaskOut(
        id=str(doc["_id"]),
        user_id=str(doc.get("user_id")),
        email_id=doc.get("email_id"),
        email_subject=doc.get("email_subject"),
        title=doc.get("title", ""),
        description=doc.get("description"),
        due_date=doc.get("due_date"),
        priority=doc.get("priority", "medium"),
        status=doc.get("status", "pending"),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at", datetime.now(timezone.utc))
    )

@router.get("", response_model=TaskListResponse)
async def get_actions(
    status_filter: Optional[str] = Query(None, pattern="^(all|pending|in_progress|completed)$"),
    priority_filter: Optional[str] = Query(None, pattern="^(all|high|medium|low)$"),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("created_at", pattern="^(created_at|due_date|priority)$"),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = current_user["id"]
    query = {"user_id": user_id}

    if status_filter and status_filter != "all":
        query["status"] = status_filter
    if priority_filter and priority_filter != "all":
        query["priority"] = priority_filter
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"email_subject": {"$regex": search, "$options": "i"}}
        ]

    sort_field = "created_at"
    sort_dir = -1
    if sort_by == "due_date":
        sort_field = "due_date"
        sort_dir = 1
    elif sort_by == "priority":
        sort_field = "priority"
        sort_dir = 1

    cursor = db.tasks.find(query).sort(sort_field, sort_dir)
    tasks_raw = await cursor.to_list(length=200)
    tasks = [doc_to_task_out(doc) for doc in tasks_raw]

    pending_count = await db.tasks.count_documents({"user_id": user_id, "status": "pending"})
    in_progress_count = await db.tasks.count_documents({"user_id": user_id, "status": "in_progress"})
    completed_count = await db.tasks.count_documents({"user_id": user_id, "status": "completed"})

    return TaskListResponse(
        tasks=tasks,
        total=len(tasks),
        pending_count=pending_count,
        in_progress_count=in_progress_count,
        completed_count=completed_count
    )

@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_action(task_in: TaskCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)

    doc = {
        "user_id": user_id,
        "email_id": task_in.email_id,
        "email_subject": task_in.email_subject,
        "title": task_in.title.strip(),
        "description": task_in.description.strip() if task_in.description else None,
        "due_date": task_in.due_date,
        "priority": task_in.priority,
        "status": task_in.status,
        "created_at": now,
        "updated_at": now
    }
    insert_res = await db.tasks.insert_one(doc)
    doc["_id"] = insert_res.inserted_id
    return doc_to_task_out(doc)

@router.patch("/{action_id}", response_model=TaskOut)
async def update_action(action_id: str, task_update: TaskUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["id"]
    oid = ObjectId(action_id) if ObjectId.is_valid(action_id) else action_id

    update_fields = {}
    if task_update.title is not None:
        update_fields["title"] = task_update.title.strip()
    if task_update.description is not None:
        update_fields["description"] = task_update.description.strip()
    if task_update.due_date is not None:
        update_fields["due_date"] = task_update.due_date
    if task_update.priority is not None:
        update_fields["priority"] = task_update.priority
    if task_update.status is not None:
        update_fields["status"] = task_update.status

    if not update_fields:
        doc = await db.tasks.find_one({"_id": oid, "user_id": user_id})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action item not found.")
        return doc_to_task_out(doc)

    update_fields["updated_at"] = datetime.now(timezone.utc)
    res = await db.tasks.update_one({"_id": oid, "user_id": user_id}, {"$set": update_fields})
    if res.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action item not found.")

    doc = await db.tasks.find_one({"_id": oid, "user_id": user_id})
    return doc_to_task_out(doc)

@router.delete("/{action_id}")
async def delete_action(action_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["id"]
    oid = ObjectId(action_id) if ObjectId.is_valid(action_id) else action_id

    res = await db.tasks.delete_one({"_id": oid, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action item not found.")

    return {"message": "Action item removed successfully."}
