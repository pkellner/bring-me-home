# Cascade Delete Analysis for Prisma Schema

## ✅ UPDATE: All cascade deletes have been fixed!

The following cascade delete configurations were added to the schema:
1. `Supporter` → User: `onDelete: SetNull` (appropriate since userId is optional)
2. `ImageStorage` → User: `onDelete: SetNull` (appropriate since uploadedById is optional)
3. `PersonHistory` → User: `onDelete: Restrict` (prevents deletion of users who created history)
4. `EmailNotification` → User: `onDelete: Cascade`
5. `EmailNotification` → Person: `onDelete: Cascade`
6. `EmailNotification` → PersonHistory: `onDelete: Cascade`

---

# Original Analysis

## Summary
After reviewing the schema, I found several models that are **MISSING** cascade delete configurations, which could lead to orphaned records or deletion failures.

## Models WITH Proper Cascade Delete ✅

### User-related cascades:
- `UserRole` → User (line 53): `onDelete: Cascade`
- `TownAccess` → User (line 296): `onDelete: Cascade`
- `TownAccess` → Town (line 295): `onDelete: Cascade`
- `PersonAccess` → User (line 311): `onDelete: Cascade`
- `PersonAccess` → Person (line 310): `onDelete: Cascade`
- `PasswordResetToken` → User (line 508): `onDelete: Cascade`
- `EmailOptOut` → User (line 544): `onDelete: Cascade`
- `EmailOptOut` → Person (line 545): `onDelete: Cascade`

### Person-related cascades:
- `Person` → Town (line 148): `onDelete: Cascade`
- `Story` → Person (line 174): `onDelete: Cascade`
- `Supporter` → Person (line 204): `onDelete: Cascade`
- `Comment` → Person (line 255): `onDelete: Cascade`
- `Comment` → PersonHistory (line 256): `onDelete: Cascade`
- `AnonymousSupport` → Person (line 280): `onDelete: Cascade`
- `FamilyPrivacySettings` → Person (line 443): `onDelete: Cascade`
- `PersonImage` → Person (line 479): `onDelete: Cascade`
- `PersonImage` → ImageStorage (line 478): `onDelete: Cascade`
- `PersonHistory` → Person (line 527): `onDelete: Cascade`

### DetentionCenter-related cascades:
- `DetentionCenterImage` → DetentionCenter (line 494): `onDelete: Cascade`
- `DetentionCenterImage` → ImageStorage (line 495): `onDelete: Cascade`

### Other cascades:
- `UserRole` → Role (line 52): `onDelete: Cascade`

## Models MISSING Cascade Delete ❌

### Critical Missing Cascades:

1. **`Supporter` → User** (line 205)
   - Currently: No cascade delete specified
   - Risk: Deleting a user won't delete their supporter records

2. **`ImageStorage` → User (uploadedBy)** (line 462)
   - Currently: No cascade delete specified
   - Risk: Deleting a user won't affect uploaded images

3. **`PersonHistory` → User (createdBy)** (line 528)
   - Currently: No cascade delete specified
   - Risk: Deleting a user will fail if they created any PersonHistory records

4. **`EmailNotification` → User** (line 572)
   - Currently: No cascade delete specified
   - Risk: Deleting a user will fail if they have any email notifications

5. **`EmailNotification` → Person** (line 573)
   - Currently: No cascade delete specified
   - Risk: Deleting a person won't delete their email notifications

6. **`EmailNotification` → PersonHistory** (line 574)
   - Currently: No cascade delete specified
   - Risk: Deleting a PersonHistory won't delete associated email notifications

### Optional Relations (OK to not cascade):

1. **`Town` → Layout` (line 78)** - OK, layouts can be shared
2. **`Town` → Theme` (line 79)** - OK, themes can be shared
3. **`Person` → DetentionCenter` (line 145)** - OK, detention centers are shared
4. **`Person` → Layout` (line 146)** - OK, layouts can be shared
5. **`Person` → Theme` (line 147)** - OK, themes can be shared

## Recommended Actions

### High Priority Fixes:

```prisma
// Fix EmailNotification cascades
model EmailNotification {
  // ...
  user          User           @relation("sentTo", fields: [userId], references: [id], onDelete: Cascade)
  person        Person?        @relation(fields: [personId], references: [id], onDelete: Cascade)
  personHistory PersonHistory? @relation(fields: [personHistoryId], references: [id], onDelete: Cascade)
  // ...
}

// Fix PersonHistory → User cascade
model PersonHistory {
  // ...
  createdBy User @relation(fields: [createdByUserId], references: [id], onDelete: Restrict)
  // Note: Using Restrict here because we probably want to prevent deletion of users who created history
  // ...
}
```

### Medium Priority Fixes:

```prisma
// Fix Supporter → User cascade
model Supporter {
  // ...
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)
  // Note: SetNull is appropriate here since userId is optional
  // ...
}

// Fix ImageStorage → User cascade
model ImageStorage {
  // ...
  uploadedBy User? @relation(fields: [uploadedById], references: [id], onDelete: SetNull)
  // Note: SetNull is appropriate here since uploadedById is optional
  // ...
}
```

## Testing Recommendations

1. Test deleting a User and verify:
   - EmailNotifications are handled properly
   - PersonHistory records remain but createdBy is handled
   - Supporter records have userId set to null
   - ImageStorage records have uploadedById set to null

2. Test deleting a Person and verify:
   - All EmailNotifications for that person are deleted
   - All other related records cascade properly

3. Test deleting a PersonHistory and verify:
   - Associated EmailNotifications are deleted
   - Comments are deleted