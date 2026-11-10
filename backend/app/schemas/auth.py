import re
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

class UserPreferences(BaseModel):
    store_frames: bool = False

class UserSchema(BaseModel):
    id: str
    name: str
    email: str
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    created_at: str
    updated_at: str

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=10, max_length=128)
    confirm_password: str

    @field_validator("name")
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty or whitespace only")
        return v

    @field_validator("email")
    def lower_email(cls, v: EmailStr) -> str:
        return str(v).lower()

    @field_validator("password")
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @model_validator(mode="after")
    def verify_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    def lower_email(cls, v: EmailStr) -> str:
        return str(v).lower()

class AuthResponse(BaseModel):
    user: UserSchema

