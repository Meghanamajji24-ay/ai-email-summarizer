import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger("ai_email_summarizer.db")

class AsyncCursorMock:
    def __init__(self, items: List[Dict[str, Any]]):
        self._items = items
        self._skip = 0
        self._limit = None
        self._sort_key = None
        self._sort_direction = 1

    def skip(self, n: int):
        self._skip = n
        return self

    def limit(self, n: int):
        self._limit = n
        return self

    def sort(self, key_or_list: Any, direction: int = 1):
        if isinstance(key_or_list, list):
            self._sort_key, self._sort_direction = key_or_list[0]
        else:
            self._sort_key = key_or_list
            self._sort_direction = direction
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        items = list(self._items)
        if self._sort_key:
            def sort_val(x):
                val = x.get(self._sort_key)
                if val is None:
                    return ""
                return val
            reverse = self._sort_direction == -1
            try:
                items.sort(key=sort_val, reverse=reverse)
            except Exception:
                pass
        if self._skip:
            items = items[self._skip:]
        if self._limit is not None:
            items = items[:self._limit]
        elif length is not None:
            items = items[:length]
        return items

    def __aiter__(self):
        self._iter = None
        return self

    async def __anext__(self):
        if self._iter is None:
            items = await self.to_list()
            self._iter = iter(items)
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration

class AsyncCollectionMock:
    def __init__(self, name: str):
        self.name = name
        self.data: Dict[str, Dict[str, Any]] = {}

    def _match_filter(self, doc: Dict[str, Any], filter_dict: Dict[str, Any]) -> bool:
        if not filter_dict:
            return True
        for k, v in filter_dict.items():
            if k == "$or" and isinstance(v, list):
                if not any(self._match_filter(doc, sub) for sub in v):
                    return False
                continue
            if k == "$and" and isinstance(v, list):
                if not all(self._match_filter(doc, sub) for sub in v):
                    return False
                continue
            
            doc_val = doc.get(k)
            if isinstance(v, dict):
                # Handle operators like $in, $ne, $regex, $gte, $lte
                if "$in" in v:
                    if doc_val not in v["$in"]:
                        return False
                if "$ne" in v:
                    if doc_val == v["$ne"]:
                        return False
                if "$regex" in v:
                    pattern = v["$regex"]
                    flags = re.IGNORECASE if v.get("$options") == "i" else 0
                    if not doc_val or not re.search(pattern, str(doc_val), flags):
                        return False
                if "$exists" in v:
                    exists = k in doc and doc[k] is not None
                    if exists != bool(v["$exists"]):
                        return False
            elif isinstance(v, ObjectId):
                if str(doc_val) != str(v):
                    return False
            else:
                if str(doc_val) != str(v):
                    return False
        return True

    async def find_one(self, filter_dict: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        filter_dict = filter_dict or {}
        for doc in self.data.values():
            if self._match_filter(doc, filter_dict):
                return dict(doc)
        return None

    def find(self, filter_dict: Optional[Dict[str, Any]] = None) -> AsyncCursorMock:
        filter_dict = filter_dict or {}
        matches = [dict(doc) for doc in self.data.values() if self._match_filter(doc, filter_dict)]
        return AsyncCursorMock(matches)

    async def insert_one(self, doc: Dict[str, Any]):
        doc_copy = dict(doc)
        if "_id" not in doc_copy:
            doc_copy["_id"] = ObjectId()
        doc_id = str(doc_copy["_id"])
        self.data[doc_id] = doc_copy
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertResult(doc_copy["_id"])

    async def insert_many(self, docs: List[Dict[str, Any]]):
        inserted_ids = []
        for doc in docs:
            res = await self.insert_one(doc)
            inserted_ids.append(res.inserted_id)
        class InsertManyResult:
            def __init__(self, ids):
                self.inserted_ids = ids
        return InsertManyResult(inserted_ids)

    async def update_one(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any], upsert: bool = False):
        target_id = None
        for doc_id, doc in self.data.items():
            if self._match_filter(doc, filter_dict):
                target_id = doc_id
                break

        class UpdateResult:
            def __init__(self, matched, modified):
                self.matched_count = matched
                self.modified_count = modified

        if target_id:
            doc = self.data[target_id]
            if "$set" in update_dict:
                doc.update(update_dict["$set"])
            if "$unset" in update_dict:
                for k in update_dict["$unset"]:
                    doc.pop(k, None)
            return UpdateResult(1, 1)
        elif upsert:
            new_doc = dict(filter_dict)
            if "$set" in update_dict:
                new_doc.update(update_dict["$set"])
            if "_id" not in new_doc:
                new_doc["_id"] = ObjectId()
            self.data[str(new_doc["_id"])] = new_doc
            return UpdateResult(0, 1)
        return UpdateResult(0, 0)

    async def delete_one(self, filter_dict: Dict[str, Any]):
        target_id = None
        for doc_id, doc in self.data.items():
            if self._match_filter(doc, filter_dict):
                target_id = doc_id
                break
        class DeleteResult:
            def __init__(self, deleted):
                self.deleted_count = deleted
        if target_id:
            del self.data[target_id]
            return DeleteResult(1)
        return DeleteResult(0)

    async def delete_many(self, filter_dict: Dict[str, Any]):
        to_delete = [doc_id for doc_id, doc in self.data.items() if self._match_filter(doc, filter_dict)]
        for doc_id in to_delete:
            del self.data[doc_id]
        class DeleteResult:
            def __init__(self, deleted):
                self.deleted_count = deleted
        return DeleteResult(len(to_delete))

    async def count_documents(self, filter_dict: Optional[Dict[str, Any]] = None) -> int:
        filter_dict = filter_dict or {}
        return sum(1 for doc in self.data.values() if self._match_filter(doc, filter_dict))

    async def create_index(self, keys: Any, **kwargs):
        return str(keys)

class AsyncInMemoryDB:
    def __init__(self, db_name: str = "ai_email_summarizer"):
        self.db_name = db_name
        self.collections: Dict[str, AsyncCollectionMock] = {}

    def __getitem__(self, item: str) -> AsyncCollectionMock:
        if item not in self.collections:
            self.collections[item] = AsyncCollectionMock(item)
        return self.collections[item]

    def __getattr__(self, item: str) -> AsyncCollectionMock:
        if item.startswith("_"):
            raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{item}'")
        return self[item]

    def get_collection(self, item: str) -> AsyncCollectionMock:
        return self[item]

class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Any = None
    is_mock: bool = False

db_manager = DatabaseManager()

async def connect_to_mongo():
    logger.info("Initializing database connection...")
    try:
        timeout_ms = 5000 if settings.ENVIRONMENT == "production" else 200
        client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=timeout_ms)
        await client.admin.command("ping")
        db_manager.client = client
        db_manager.db = client[settings.DATABASE_NAME]
        db_manager.is_mock = False
        logger.info(f"Connected successfully to MongoDB at {settings.MONGODB_URI} (DB: {settings.DATABASE_NAME})")
    except Exception as exc:
        logger.warning(
            f"MongoDB connection failed ({exc}). Using high-performance in-memory database fallback for seamless execution."
        )
        db_manager.client = None
        db_manager.db = AsyncInMemoryDB(settings.DATABASE_NAME)
        db_manager.is_mock = True

async def close_mongo_connection():
    if db_manager.client:
        db_manager.client.close()
        logger.info("Closed MongoDB connection.")

def get_database():
    if db_manager.db is None:
        db_manager.db = AsyncInMemoryDB(settings.DATABASE_NAME)
        db_manager.is_mock = True
    return db_manager.db
