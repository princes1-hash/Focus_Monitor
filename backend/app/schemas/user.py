import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator
from app.schemas.auth import UserPreferences, UserSchema

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=80)
    preferences: Optional[UserPreferences] = None

    @field_validator("name")
    def clean_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be empty or whitespace only")
        return v

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=10, max_length=128)
    confirm_new_password: str

    @field_validator("new_password")
    def validate_new_password(cls, v: str) -> str:
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_new_password:
            raise ValueError("New passwords do not match")
        return self

class DeleteAccountRequest(BaseModel):
    password: str

