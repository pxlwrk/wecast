"""Admin endpoints: LDAP group mappings, LDAP sync, system health."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.ldap import LDAPAuthError, resolve_role
from app.core.permissions import CurrentUser, require_admin
from app.models.user import LdapGroupMapping

router = APIRouter(prefix="/admin", tags=["admin"])


class LdapGroupMappingCreate(BaseModel):
    group_dn: str
    role: str


class LdapGroupMappingResponse(BaseModel):
    id: int
    group_dn: str
    role: str

    model_config = {"from_attributes": True}


@router.get("/ldap-groups", response_model=List[LdapGroupMappingResponse])
async def list_ldap_mappings(
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(require_admin),
) -> List[LdapGroupMappingResponse]:
    result = await db.execute(select(LdapGroupMapping))
    return [LdapGroupMappingResponse.model_validate(m) for m in result.scalars()]


@router.post("/ldap-groups", response_model=LdapGroupMappingResponse, status_code=status.HTTP_201_CREATED)
async def add_ldap_mapping(
    body: LdapGroupMappingCreate,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(require_admin),
) -> LdapGroupMappingResponse:
    if body.role not in ("admin", "moderator", "user"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

    existing = await db.execute(select(LdapGroupMapping).where(LdapGroupMapping.group_dn == body.group_dn))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Mapping already exists")

    mapping = LdapGroupMapping(group_dn=body.group_dn, role=body.role)
    db.add(mapping)
    await db.commit()
    await db.refresh(mapping)
    return LdapGroupMappingResponse.model_validate(mapping)


@router.delete("/ldap-groups/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ldap_mapping(
    mapping_id: int,
    db: AsyncSession = Depends(get_db),
    _: CurrentUser = Depends(require_admin),
) -> None:
    mapping = await db.get(LdapGroupMapping, mapping_id)
    if not mapping:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mapping not found")
    await db.delete(mapping)
    await db.commit()


@router.get("/health")
async def health_check() -> dict:
    """Simple liveness probe for monitoring."""
    return {"status": "ok"}
