# Admin Features Documentation

## Comments Management

### Bulk Actions

#### Reject All
The "Reject All" button on the comments screen provides a way to bulk reject multiple pending comments at once.

**How it works:**
1. Filters all comments to find those that are:
   - Not approved (`isApproved = false`)
   - Not marked as privacy-required (`privacyRequiredDoNotShowPublicly = false`)
2. Prompts the admin to provide a reason for rejection
3. Updates all selected comments with:
   - `isApproved = false` (explicitly set to rejected)
   - `approvedAt = current timestamp`
   - `approvedBy = current admin user ID`
   - `moderatorNotes = provided rejection reason`

**Important Notes:**
- Only affects pending comments (not already approved or privacy-flagged ones)
- Requires a rejection reason to proceed
- Permission-based: Admin must have `comments.update` permission
- For non-site admins, verifies write access to each person's profile
- Updates are atomic - all succeed or all fail

#### Approve All
Similar bulk action that approves all pending comments without requiring individual review.

### Filtering Options
- **By Town**: Filter comments by the town of the detained person
- **By Status**: Show pending, approved, or all comments
- **Group By Person**: Organize comments by the detained person they relate to

## Map Administration

### Admin View Features
When logged in as an admin, the SupportMap component shows additional controls:

1. **Current Map View Display**: Shows the current center coordinates and zoom level
2. **Copy Config Button**: Allows copying the current map view configuration
3. **Real-time Updates**: As you pan/zoom the map, the coordinates update in real-time

This is useful for:
- Setting default map views for specific regions
- Debugging location data
- Creating custom map configurations

## Security Features

### Permission System
The application uses a role-based permission system:
- **Site Admin**: Full access to all features
- **Town Admin**: Access limited to assigned towns
- **Person Admin**: Access limited to assigned persons

### Access Control
- Comments require appropriate permissions to view/edit
- Bulk actions verify permissions for each affected item
- API endpoints validate user permissions before processing