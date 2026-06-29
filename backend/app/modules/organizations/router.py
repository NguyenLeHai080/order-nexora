"""Router Organizations — CRUD, tree, stats, bulk, public endpoints.

Theo dự án tham chiếu: /public và /public-options không cần auth; còn lại
cần auth + X-Organization-Id.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.context import RequestContext
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.core.pagination import ListParams, list_params
from app.core.response import paginated, success
from app.modules.auth.dependencies import require
from app.modules.organizations.models import Organization
from app.modules.organizations.repository import OrganizationRepository
from app.modules.organizations.schemas import (
    BulkIdsRequest,
    BulkStatusRequest,
    OrganizationCreate,
    OrganizationOut,
    OrganizationUpdate,
)
from app.modules.organizations.utils import slugify

router = APIRouter(prefix="/organizations", tags=["Core - Organization"])


def _out(o: Organization) -> dict:
    return OrganizationOut.model_validate(o).model_dump()


# ---------- Public ----------
@router.get("/public", summary="Danh sách organization công khai")
def public_index(params: ListParams = Depends(list_params), db: Session = Depends(get_db)) -> dict:
    repo = OrganizationRepository(db)
    params.status = params.status or "active"
    items, _ = repo.paginate(params)
    return {"data": [_out(i) for i in items], "success": "true"}


@router.get("/public-options", summary="Organization công khai cho dropdown")
def public_options(params: ListParams = Depends(list_params), db: Session = Depends(get_db)) -> dict:
    repo = OrganizationRepository(db)
    params.status = params.status or "active"
    items, _ = repo.paginate(params)
    return {
        "data": [{"id": i.id, "name": i.name, "description": i.description} for i in items],
        "success": "true",
    }


# ---------- Protected ----------
@router.get("/stats", summary="Thống kê organization")
def stats(
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("organizations.index")),
) -> dict:
    total = db.scalar(select(func.count()).select_from(Organization)) or 0
    active = db.scalar(
        select(func.count()).select_from(Organization).where(Organization.status == "active")
    ) or 0
    return success({"total": total, "active": active, "inactive": total - active})


@router.get("/tree", summary="Cây organization")
def tree(
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("organizations.index")),
) -> dict:
    stmt = select(Organization).order_by(Organization.sort_order)
    if status:
        stmt = stmt.where(Organization.status == status)
    all_orgs = list(db.scalars(stmt).all())

    nodes: dict[int, dict] = {
        o.id: {
            "id": o.id,
            "name": o.name,
            "slug": o.slug,
            "status": o.status,
            "parent_id": o.parent_id,
            "children": [],
        }
        for o in all_orgs
    }
    roots = []
    for o in all_orgs:
        if o.parent_id and o.parent_id in nodes:
            nodes[o.parent_id]["children"].append(nodes[o.id])
        else:
            roots.append(nodes[o.id])
    return success(roots)


@router.post("/bulk-delete", summary="Xóa hàng loạt organization")
def bulk_delete(
    body: BulkIdsRequest,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("organizations.destroy")),
) -> dict:
    OrganizationRepository(db).bulk_delete(body.ids)
    return success(message="Đã xóa thành công các organization được chọn!")


@router.patch("/bulk-status", summary="Cập nhật trạng thái hàng loạt")
def bulk_status(
    body: BulkStatusRequest,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("organizations.update")),
) -> dict:
    db.query(Organization).filter(Organization.id.in_(body.ids)).update(
        {Organization.status: body.status}, synchronize_session=False
    )
    db.commit()
    return success(message="Cập nhật trạng thái organization thành công.")


@router.get("", summary="Danh sách organization")
def index(
    params: ListParams = Depends(list_params),
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("organizations.index")),
) -> dict:
    items, total = OrganizationRepository(db).paginate(params)
    return paginated([_out(i) for i in items], total, params.page, params.limit)


@router.get("/{org_id}", summary="Chi tiết organization")
def show(
    org_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("organizations.show")),
) -> dict:
    obj = db.get(Organization, org_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy organization.")
    data = _out(obj)
    data["parent"] = _out(obj.parent) if obj.parent else None
    data["children"] = [_out(c) for c in obj.children]
    return {"data": data, "success": "true"}


@router.post("", status_code=201, summary="Tạo organization mới")
def create(
    body: OrganizationCreate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("organizations.store")),
) -> dict:
    repo = OrganizationRepository(db)
    data = body.model_dump()
    data["slug"] = data.get("slug") or slugify(body.name)
    if body.parent_id:
        parent = db.get(Organization, body.parent_id)
        data["depth"] = (parent.depth + 1) if parent else 0
    obj = repo.create(**data)
    return {"data": _out(obj), "success": "true", "message": "Organization đã được tạo thành công!"}


@router.put("/{org_id}", summary="Cập nhật organization")
def update(
    org_id: int,
    body: OrganizationUpdate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("organizations.update")),
) -> dict:
    repo = OrganizationRepository(db)
    obj = repo.get(org_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy organization.")
    obj = repo.update(obj, **body.model_dump(exclude_unset=True))
    return {"data": _out(obj), "success": "true", "message": "Cập nhật organization thành công."}


@router.delete("/{org_id}", summary="Xóa organization")
def destroy(
    org_id: int,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require("organizations.destroy")),
) -> dict:
    repo = OrganizationRepository(db)
    obj = repo.get(org_id)
    if obj is None:
        raise NotFoundError("Không tìm thấy organization.")
    repo.delete(obj)
    return success(message="Đã xóa organization thành công!")
