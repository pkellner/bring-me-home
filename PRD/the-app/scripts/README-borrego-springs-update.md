# Update Borrego Springs Layout Script

This script updates the Borrego Springs town to use a 'grid' layout type with specific sections.

## What it does

1. Creates a new layout called "Grid with Gallery" if it doesn't exist
2. Sets this layout as the default for Borrego Springs town
3. The layout includes these sections in order:
   - `image`
   - `info` 
   - `gallery-grid`
   - `story`
   - `comments`

## How to run

From the project root directory:

```bash
# Using tsx directly
npx tsx scripts/update-borrego-springs-layout.ts

# Or if you have tsx installed globally
tsx scripts/update-borrego-springs-layout.ts
```

## What happens

- The script will create or find the "Grid with Gallery" layout
- It will update Borrego Springs town to use this layout as default
- All persons in Borrego Springs will inherit this layout (unless they have person-specific overrides)
- The script will show you:
  - The layout details
  - How many persons are affected
  - Sample persons from the town

## Notes

- This only affects the town's default layout
- Individual persons with custom layouts will keep their overrides
- The layout type is 'grid' with the specified sections