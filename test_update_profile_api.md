# API Test: Update User Profile

## Endpoint
`PUT /auth/profile`

## Headers
- `Authorization: Bearer <your-jwt-token>`
- `Content-Type: application/json`

## Request Body Examples

### 1. Update Profile Image Only
```json
{
  "img_url": "https://example.com/profile-images/new-avatar.jpg"
}
```

### 2. Update Basic Information
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com"
}
```

### 3. Update Complete Profile
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "img_url": "https://example.com/profile-images/avatar.jpg",
  "contact": "+1234567890",
  "address": "123 Main Street, City, Country",
  "date_of_birth": "1990-01-01",
  "gender": "MALE"
}
```

### 4. Update Only Profile Details (no user table fields)
```json
{
  "img_url": "https://example.com/profile-images/new-avatar.jpg",
  "contact": "+1234567890",
  "address": "123 Main Street, City, Country",
  "date_of_birth": "1990-01-01",
  "gender": "FEMALE"
}
```

## curl Examples

### Update Profile Image
```bash
curl -X PUT http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "img_url": "https://example.com/profile-images/new-avatar.jpg"
  }'
```

### Update Complete Profile
```bash
curl -X PUT http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "img_url": "https://example.com/profile-images/avatar.jpg",
    "contact": "+1234567890",
    "address": "123 Main Street, City, Country",
    "date_of_birth": "1990-01-01",
    "gender": "MALE"
  }'
```

## Response Format

### Success Response (200)
```json
{
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "user-uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "gender": "MALE",
      "status": "ACTIVE",
      "role_id": "user_role",
      "img_url": "https://example.com/profile-images/avatar.jpg",
      "contact": "+1234567890",
      "address": "123 Main Street, City, Country",
      "date_of_birth": "1990-01-01",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-02T12:00:00.000Z"
    }
  }
}
```

### Error Response (409)
```json
{
  "message": "Email already in use"
}
```

### Error Response (404)
```json
{
  "message": "User not found"
}
```

## Notes

1. **Partial Updates**: You can update any subset of fields - only provided fields will be updated
2. **Email Uniqueness**: If updating email, it must be unique across all users
3. **Transaction Safety**: Updates to both `users` and `user_profile` tables are wrapped in a transaction
4. **Image URL**: The `img_url` field expects a full URL to the profile image
5. **Date Format**: `date_of_birth` should be in ISO format (YYYY-MM-DD)
6. **Gender**: Accepts values like 'MALE', 'FEMALE', 'OTHER', etc.
