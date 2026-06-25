from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from uuid import UUID

class ProfileBase(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    height: Optional[float] = None
    height_unit: Optional[str] = None
    weight: Optional[float] = None
    weight_unit: Optional[str] = None
    target_weight: Optional[float] = None
    target_weight_unit: Optional[str] = None
    current_physique: Optional[str] = None
    target_goal: Optional[str] = None
    dietary_identity: Optional[str] = None
    equipment_access: Optional[str] = None
    onboarded: Optional[bool] = False

class ProfileCreate(ProfileBase):
    id: UUID

class ProfileUpdate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
