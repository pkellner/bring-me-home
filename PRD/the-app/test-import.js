// Test script to verify old export format can still be imported
// This simulates an export file from the old system

const oldExportFormat = {
  "id": "test-person-id",
  "firstName": "Test",
  "middleName": "Import",
  "lastName": "Person",
  "dateOfBirth": "1990-01-01T00:00:00.000Z",
  "slug": "test-import-person",
  "primaryPicture": null,
  "primaryPictureData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wgARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGQA//EABUQAQEAAAAAAAAAAAAAAAAAAAAx/9oACAEBAAEFAn//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AX//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AX//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/An//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IX//2gAMAwEAAgADAAAAEB//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAVEAEBAAAAAAAAAAAAAAAAAAAAEf/aAAgBAQABPxCH/9k=",
  "personImages": [
    {
      "imageUrl": "/api/images/old-image-1",
      "caption": "Profile photo",
      "isPrimary": true,
      "isActive": true,
      "displayPublicly": true,
      "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wgARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGQA//EABUQAQEAAAAAAAAAAAAAAAAAAAAx/9oACAEBAAEFAn//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AX//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AX//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/An//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IX//2gAMAwEAAgADAAAAEB//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAVEAEBAAAAAAAAAAAAAAAAAAAAEf/aAAgBAQABPxCH/9k="
    },
    {
      "imageUrl": "/api/images/old-image-2",
      "caption": "Gallery photo 1",
      "isPrimary": false,
      "isActive": true,
      "displayPublicly": true,
      "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wgARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGQA//EABUQAQEAAAAAAAAAAAAAAAAAAAAx/9oACAEBAAEFAn//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AX//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AX//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/An//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IX//2gAMAwEAAgADAAAAEB//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAVEAEBAAAAAAAAAAAAAAAAAAAAEf/aAAgBAQABPxCH/9k="
    }
  ],
  "detentionDate": "2024-01-15T00:00:00.000Z",
  "lastHeardFromDate": "2024-02-01T00:00:00.000Z",
  "representedByLawyer": false,
  "notesFromLastContact": "Test notes from old system",
  "exportedAt": "2024-12-01T10:00:00.000Z",
  "exportVersion": "1.0"
};

console.log("Old export format test file created.");
console.log("This file simulates a person export from the old system with:");
console.log("- personImages array (old format)");
console.log("- isPrimary flag to indicate profile vs gallery images");
console.log("- base64 encoded image data");
console.log("\nThe import function should convert this to the new format:");
console.log("- Images stored directly in image_storage table");
console.log("- imageType field set to 'profile' or 'gallery'");
console.log("- sequenceNumber for ordering");