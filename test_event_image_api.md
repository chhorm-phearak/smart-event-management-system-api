# API Test: Event Image Update with Old Image Management

## Endpoint
`POST /events/:id/images`

## Headers
- `Authorization: Bearer <your-jwt-token>`
- `Content-Type: application/json`

## Request Body

### Basic Request (without marking old images as deleted)
```json
{
  "image_urls": [
    "https://example.com/new-image1.jpg",
    "https://example.com/new-image2.jpg"
  ]
}
```

### Request with Old Image Management
```json
{
  "image_urls": [
    "https://example.com/replacement-image.jpg"
  ],
  "mark_old_as_deleted": true
}
```

## curl Examples

### Upload Images Without Marking Old as Deleted
```bash
curl -X POST http://localhost:3000/events/your-event-id/images \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image_urls": [
      "https://example.com/additional-image1.jpg",
      "https://example.com/additional-image2.jpg"
    ]
  }'
```

### Upload Images and Mark Old as Deleted
```bash
curl -X POST http://localhost:3000/events/your-event-id/images \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image_urls": [
      "https://example.com/replacement-image.jpg"
    ],
    "mark_old_as_deleted": true
  }'
```

## Response Format

### Success Response (201)
```json
{
  "message": "Event images saved successfully",
  "data": [
    {
      "id": "image-uuid-1",
      "event_id": "event-uuid",
      "image_url": "https://example.com/replacement-image.jpg",
      "description": null,
      "created_at": "2024-01-01T12:00:00.000Z",
      "updated_at": "2024-01-01T12:00:00.000Z"
    }
  ],
  "marked_old_as_deleted": true
}
```

### Error Response (400)
```json
{
  "message": "image_urls (array of image URLs) is required and must not be empty"
}
```

### Error Response (403)
```json
{
  "message": "You do not have permission to upload images for this event"
}
```

### Error Response (404)
```json
{
  "message": "Event not found"
}
```

## Behavior

### When `mark_old_as_deleted: false` (default)
- New images are added to the event
- Old images remain active
- All images (old + new) are returned by `GET /events/:id/images`

### When `mark_old_as_deleted: true`
- New images are added to the event
- All existing images for the event are marked as `is_deleted = true`
- Only the new images are returned by `GET /events/:id/images`
- Old images are preserved in the database but hidden from API responses

## Database Changes

### Event Images Table Structure
```sql
CREATE TABLE event_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    image_url TEXT NOT NULL,
    description TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Query Changes
- `getEventImages()` now filters: `WHERE is_deleted = FALSE OR is_deleted IS NULL`
- `deleteEventImage()` now sets: `is_deleted = TRUE` instead of `DELETE`
- `addEventImage()` optionally marks old images as deleted before adding new ones

## Use Cases

### 1. Image Replacement
When you want to replace all event images with new ones:
```json
{
  "image_urls": ["https://example.com/new-main-image.jpg"],
  "mark_old_as_deleted": true
}
```

### 2. Adding Additional Images
When you want to add more images without removing existing ones:
```json
{
  "image_urls": [
    "https://example.com/extra-image1.jpg",
    "https://example.com/extra-image2.jpg"
  ]
}
```

### 3. Bulk Image Update
When updating multiple images at once:
```json
{
  "image_urls": [
    "https://example.com/new-image1.jpg",
    "https://example.com/new-image2.jpg",
    "https://example.com/new-image3.jpg"
  ],
  "mark_old_as_deleted": true
}
```

## Notes

1. **Transaction Safety**: All operations are wrapped in database transactions
2. **Soft Delete**: Old images are marked as deleted, not permanently removed
3. **Backward Compatibility**: Existing functionality remains unchanged
4. **Permission Check**: Only event owners or admins can upload images
5. **URL Validation**: Only valid string URLs are processed
