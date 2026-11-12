-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'OPENED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "emailVerificationToken" TEXT,
    "emailVerificationExpires" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "optOutOfAllEmail" BOOLEAN NOT NULL DEFAULT false,
    "optOutNotes" TEXT,
    "optOutDate" TIMESTAMP(3),
    "allowAnonymousComments" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "towns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "county" TEXT,
    "zipCode" TEXT,
    "fullAddress" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "defaultThemeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "towns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "alienIdNumber" TEXT,
    "ssn" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "placeOfBirth" TEXT,
    "height" TEXT,
    "weight" TEXT,
    "eyeColor" TEXT,
    "hairColor" TEXT,
    "lastKnownAddress" TEXT NOT NULL,
    "currentAddress" TEXT,
    "phoneNumber" TEXT,
    "emailAddress" TEXT,
    "story" TEXT,
    "lastSeenDate" TIMESTAMP(3),
    "lastSeenLocation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFound" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'missing',
    "themeId" TEXT,
    "townId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bondAmount" DECIMAL(10,2),
    "bondStatus" TEXT,
    "caseNumber" TEXT,
    "countryOfOrigin" TEXT,
    "courtLocation" TEXT,
    "detentionCenterId" TEXT,
    "detentionDate" TIMESTAMP(3),
    "detentionStatus" TEXT DEFAULT 'currently_detained',
    "statusDetails" JSONB,
    "statusUpdatedAt" TIMESTAMP(3),
    "statusUpdatedBy" TEXT,
    "hearingDate" TIMESTAMP(3),
    "hearingLocation" TEXT,
    "hearingNotes" TEXT,
    "bailPostedDate" TIMESTAMP(3),
    "bailPostedBy" TEXT,
    "bailConditions" TEXT,
    "finalOutcome" TEXT,
    "finalOutcomeDate" TIMESTAMP(3),
    "finalOutcomeNotes" TEXT,
    "deportationDate" TIMESTAMP(3),
    "deportationDestination" TEXT,
    "visaGrantedType" TEXT,
    "visaGrantedDate" TIMESTAMP(3),
    "internationalAddress" TEXT,
    "legalRepEmail" TEXT,
    "legalRepFirm" TEXT,
    "legalRepName" TEXT,
    "legalRepPhone" TEXT,
    "nextCourtDate" TIMESTAMP(3),
    "releaseDate" TIMESTAMP(3),
    "detentionStory" TEXT,
    "familyMessage" TEXT,
    "lastHeardFromDate" TIMESTAMP(3),
    "notesFromLastContact" TEXT,
    "representedByLawyer" BOOLEAN NOT NULL DEFAULT false,
    "representedByNotes" TEXT,
    "slug" TEXT NOT NULL,
    "showDetentionInfo" BOOLEAN NOT NULL DEFAULT true,
    "showLastHeardFrom" BOOLEAN NOT NULL DEFAULT true,
    "showDetentionDate" BOOLEAN NOT NULL DEFAULT true,
    "showCommunitySupport" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "storyType" TEXT NOT NULL DEFAULT 'personal',
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supporters" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "fullAddress" TEXT,
    "country" TEXT,
    "relationship" TEXT,
    "displayName" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "supportMessage" TEXT,
    "shareEmail" BOOLEAN NOT NULL DEFAULT false,
    "sharePhone" BOOLEAN NOT NULL DEFAULT false,
    "shareAddress" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "personId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supporters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "moderatorNotes" TEXT,
    "personId" TEXT NOT NULL,
    "personHistoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "familyVisibilityOverride" TEXT,
    "type" TEXT NOT NULL DEFAULT 'support',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "birthdate" TIMESTAMP(3),
    "displayNameOnly" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "occupation" TEXT,
    "phone" TEXT,
    "privacyRequiredDoNotShowPublicly" BOOLEAN NOT NULL DEFAULT false,
    "requiresFamilyApproval" BOOLEAN NOT NULL DEFAULT true,
    "showBirthdate" BOOLEAN NOT NULL DEFAULT false,
    "showOccupation" BOOLEAN NOT NULL DEFAULT false,
    "wantsToHelpMore" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT,
    "showCityState" BOOLEAN NOT NULL DEFAULT true,
    "state" TEXT,
    "streetAddress" TEXT,
    "zipCode" TEXT,
    "showComment" BOOLEAN NOT NULL DEFAULT true,
    "privateNoteToFamily" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geoCity" TEXT,
    "region" TEXT,
    "country" TEXT,
    "processedForLatLon" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "hideRequested" BOOLEAN NOT NULL DEFAULT false,
    "hideRequestedAt" TIMESTAMP(3),
    "verificationEmailSentAt" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anonymous_support" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "personHistoryId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geoCity" TEXT,
    "region" TEXT,
    "country" TEXT,
    "processedForLatLon" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "anonymous_support_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "town_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "townId" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'read',
    "notifyOnComment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "town_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'read',
    "notifyOnComment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "colors" TEXT NOT NULL,
    "cssVars" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "dataType" TEXT NOT NULL DEFAULT 'string',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" TEXT,
    "newValues" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detention_centers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facilityType" TEXT NOT NULL,
    "operatedBy" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "phoneNumber" TEXT,
    "faxNumber" TEXT,
    "emailAddress" TEXT,
    "website" TEXT,
    "capacity" INTEGER,
    "currentPopulation" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isICEFacility" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "transportInfo" TEXT,
    "visitingHours" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "imageId" TEXT,

    CONSTRAINT "detention_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_checks" (
    "id" TEXT NOT NULL,
    "testData" TEXT NOT NULL,
    "testNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_privacy_settings" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "showDetaineeEmail" BOOLEAN NOT NULL DEFAULT false,
    "showDetaineePhone" BOOLEAN NOT NULL DEFAULT false,
    "showDetaineeAddress" BOOLEAN NOT NULL DEFAULT false,
    "showAlienId" BOOLEAN NOT NULL DEFAULT false,
    "showLegalInfo" BOOLEAN NOT NULL DEFAULT false,
    "showSupporterEmails" BOOLEAN NOT NULL DEFAULT false,
    "showSupporterPhones" BOOLEAN NOT NULL DEFAULT false,
    "showSupporterAddresses" BOOLEAN NOT NULL DEFAULT false,
    "defaultCommentVisibility" TEXT NOT NULL DEFAULT 'public',
    "notifyFamilyEmail" TEXT,
    "notifyOnNewSupporter" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnNewComment" BOOLEAN NOT NULL DEFAULT true,
    "authorizedEmails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "family_privacy_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_storage" (
    "id" TEXT NOT NULL,
    "data" BYTEA,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "caption" TEXT,
    "uploadedById" TEXT,
    "storageType" TEXT NOT NULL DEFAULT 'database',
    "s3Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_storage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_images" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "imageType" TEXT NOT NULL DEFAULT 'gallery',
    "sequenceNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detention_center_images" (
    "id" TEXT NOT NULL,
    "detentionCenterId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detention_center_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_history" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sendNotifications" BOOLEAN NOT NULL DEFAULT false,
    "createdByUsername" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_opt_outs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_opt_outs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "personId" TEXT,
    "personHistoryId" TEXT,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT,
    "messageId" TEXT,
    "sentTo" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "lastMailServerMessage" TEXT,
    "lastMailServerMessageDate" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "bounceType" TEXT,
    "bounceSubType" TEXT,
    "complaintFeedbackType" TEXT,
    "diagnosticCode" TEXT,
    "suppressionChecked" BOOLEAN NOT NULL DEFAULT false,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" TEXT,
    "customizations" JSONB,
    "trackingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookUrl" TEXT,
    "webhookEvents" JSONB,

    CONSTRAINT "email_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_opt_out_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_opt_out_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trackingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookUrl" TEXT,
    "webhookHeaders" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_verification_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastAction" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "comment_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_link_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "personHistoryId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_link_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_processor_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "emailId" TEXT,
    "batchId" TEXT,
    "processId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_processor_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_processor_control" (
    "id" TEXT NOT NULL DEFAULT 'control',
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "isAborted" BOOLEAN NOT NULL DEFAULT false,
    "pausedBy" TEXT,
    "pausedAt" TIMESTAMP(3),
    "abortedBy" TEXT,
    "abortedAt" TIMESTAMP(3),
    "lastCheckAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_processor_control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_suppressions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reasonDetails" TEXT,
    "source" TEXT NOT NULL,
    "bounceType" TEXT,
    "bounceSubType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_emailVerificationToken_key" ON "users"("emailVerificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "user_roles"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "towns_slug_key" ON "towns"("slug");

-- CreateIndex
CREATE INDEX "towns_defaultThemeId_idx" ON "towns"("defaultThemeId");

-- CreateIndex
CREATE UNIQUE INDEX "persons_slug_key" ON "persons"("slug");

-- CreateIndex
CREATE INDEX "persons_townId_idx" ON "persons"("townId");

-- CreateIndex
CREATE INDEX "persons_firstName_lastName_idx" ON "persons"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "persons_slug_idx" ON "persons"("slug");

-- CreateIndex
CREATE INDEX "persons_status_idx" ON "persons"("status");

-- CreateIndex
CREATE INDEX "persons_detentionCenterId_idx" ON "persons"("detentionCenterId");

-- CreateIndex
CREATE INDEX "persons_detentionStatus_idx" ON "persons"("detentionStatus");

-- CreateIndex
CREATE INDEX "persons_finalOutcome_idx" ON "persons"("finalOutcome");

-- CreateIndex
CREATE INDEX "persons_themeId_idx" ON "persons"("themeId");

-- CreateIndex
CREATE INDEX "stories_personId_idx" ON "stories"("personId");

-- CreateIndex
CREATE INDEX "stories_language_idx" ON "stories"("language");

-- CreateIndex
CREATE UNIQUE INDEX "stories_personId_language_storyType_key" ON "stories"("personId", "language", "storyType");

-- CreateIndex
CREATE UNIQUE INDEX "supporters_verificationToken_key" ON "supporters"("verificationToken");

-- CreateIndex
CREATE INDEX "supporters_personId_idx" ON "supporters"("personId");

-- CreateIndex
CREATE INDEX "supporters_email_idx" ON "supporters"("email");

-- CreateIndex
CREATE INDEX "supporters_userId_idx" ON "supporters"("userId");

-- CreateIndex
CREATE INDEX "comments_personId_idx" ON "comments"("personId");

-- CreateIndex
CREATE INDEX "comments_personHistoryId_idx" ON "comments"("personHistoryId");

-- CreateIndex
CREATE INDEX "comments_visibility_idx" ON "comments"("visibility");

-- CreateIndex
CREATE INDEX "comments_type_idx" ON "comments"("type");

-- CreateIndex
CREATE INDEX "comments_isApproved_idx" ON "comments"("isApproved");

-- CreateIndex
CREATE INDEX "comments_email_idx" ON "comments"("email");

-- CreateIndex
CREATE INDEX "comments_processedForLatLon_idx" ON "comments"("processedForLatLon");

-- CreateIndex
CREATE INDEX "comments_userId_idx" ON "comments"("userId");

-- CreateIndex
CREATE INDEX "comments_hideRequested_idx" ON "comments"("hideRequested");

-- CreateIndex
CREATE INDEX "anonymous_support_personId_idx" ON "anonymous_support"("personId");

-- CreateIndex
CREATE INDEX "anonymous_support_personHistoryId_idx" ON "anonymous_support"("personHistoryId");

-- CreateIndex
CREATE INDEX "anonymous_support_createdAt_idx" ON "anonymous_support"("createdAt");

-- CreateIndex
CREATE INDEX "anonymous_support_processedForLatLon_idx" ON "anonymous_support"("processedForLatLon");

-- CreateIndex
CREATE INDEX "town_access_townId_idx" ON "town_access"("townId");

-- CreateIndex
CREATE UNIQUE INDEX "town_access_userId_townId_key" ON "town_access"("userId", "townId");

-- CreateIndex
CREATE INDEX "person_access_personId_idx" ON "person_access"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "person_access_userId_personId_key" ON "person_access"("userId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "themes_name_key" ON "themes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "audit_log_userId_idx" ON "audit_log"("userId");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "detention_centers_state_idx" ON "detention_centers"("state");

-- CreateIndex
CREATE INDEX "detention_centers_city_idx" ON "detention_centers"("city");

-- CreateIndex
CREATE INDEX "detention_centers_name_idx" ON "detention_centers"("name");

-- CreateIndex
CREATE INDEX "detention_centers_imageId_idx" ON "detention_centers"("imageId");

-- CreateIndex
CREATE UNIQUE INDEX "family_privacy_settings_personId_key" ON "family_privacy_settings"("personId");

-- CreateIndex
CREATE INDEX "image_storage_uploadedById_idx" ON "image_storage"("uploadedById");

-- CreateIndex
CREATE INDEX "image_storage_storageType_idx" ON "image_storage"("storageType");

-- CreateIndex
CREATE INDEX "person_images_personId_idx" ON "person_images"("personId");

-- CreateIndex
CREATE INDEX "person_images_imageId_idx" ON "person_images"("imageId");

-- CreateIndex
CREATE INDEX "person_images_sequenceNumber_idx" ON "person_images"("sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "person_images_personId_imageId_key" ON "person_images"("personId", "imageId");

-- CreateIndex
CREATE UNIQUE INDEX "detention_center_images_detentionCenterId_key" ON "detention_center_images"("detentionCenterId");

-- CreateIndex
CREATE INDEX "detention_center_images_imageId_idx" ON "detention_center_images"("imageId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "person_history_personId_idx" ON "person_history"("personId");

-- CreateIndex
CREATE INDEX "person_history_visible_idx" ON "person_history"("visible");

-- CreateIndex
CREATE INDEX "person_history_date_idx" ON "person_history"("date");

-- CreateIndex
CREATE INDEX "email_opt_outs_userId_idx" ON "email_opt_outs"("userId");

-- CreateIndex
CREATE INDEX "email_opt_outs_personId_idx" ON "email_opt_outs"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "email_opt_outs_userId_personId_key" ON "email_opt_outs"("userId", "personId");

-- CreateIndex
CREATE INDEX "email_notifications_status_scheduledFor_idx" ON "email_notifications"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "email_notifications_userId_idx" ON "email_notifications"("userId");

-- CreateIndex
CREATE INDEX "email_notifications_personId_idx" ON "email_notifications"("personId");

-- CreateIndex
CREATE INDEX "email_notifications_templateId_idx" ON "email_notifications"("templateId");

-- CreateIndex
CREATE INDEX "email_notifications_messageId_idx" ON "email_notifications"("messageId");

-- CreateIndex
CREATE INDEX "email_notifications_sentTo_idx" ON "email_notifications"("sentTo");

-- CreateIndex
CREATE UNIQUE INDEX "email_opt_out_tokens_token_key" ON "email_opt_out_tokens"("token");

-- CreateIndex
CREATE INDEX "email_opt_out_tokens_userId_idx" ON "email_opt_out_tokens"("userId");

-- CreateIndex
CREATE INDEX "email_opt_out_tokens_token_idx" ON "email_opt_out_tokens"("token");

-- CreateIndex
CREATE INDEX "email_opt_out_tokens_expiresAt_idx" ON "email_opt_out_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_name_key" ON "email_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "comment_verification_tokens_email_key" ON "comment_verification_tokens"("email");

-- CreateIndex
CREATE UNIQUE INDEX "comment_verification_tokens_tokenHash_key" ON "comment_verification_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "comment_verification_tokens_email_idx" ON "comment_verification_tokens"("email");

-- CreateIndex
CREATE INDEX "comment_verification_tokens_tokenHash_idx" ON "comment_verification_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "comment_verification_tokens_isActive_idx" ON "comment_verification_tokens"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "magic_link_tokens_token_key" ON "magic_link_tokens"("token");

-- CreateIndex
CREATE INDEX "magic_link_tokens_token_idx" ON "magic_link_tokens"("token");

-- CreateIndex
CREATE INDEX "magic_link_tokens_userId_idx" ON "magic_link_tokens"("userId");

-- CreateIndex
CREATE INDEX "magic_link_tokens_expiresAt_idx" ON "magic_link_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "email_processor_logs_timestamp_idx" ON "email_processor_logs"("timestamp");

-- CreateIndex
CREATE INDEX "email_processor_logs_level_idx" ON "email_processor_logs"("level");

-- CreateIndex
CREATE INDEX "email_processor_logs_category_idx" ON "email_processor_logs"("category");

-- CreateIndex
CREATE INDEX "email_processor_logs_emailId_idx" ON "email_processor_logs"("emailId");

-- CreateIndex
CREATE INDEX "email_processor_logs_batchId_idx" ON "email_processor_logs"("batchId");

-- CreateIndex
CREATE INDEX "email_processor_logs_processId_idx" ON "email_processor_logs"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "email_suppressions_email_key" ON "email_suppressions"("email");

-- CreateIndex
CREATE INDEX "email_suppressions_email_idx" ON "email_suppressions"("email");

-- CreateIndex
CREATE INDEX "email_suppressions_reason_idx" ON "email_suppressions"("reason");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "towns" ADD CONSTRAINT "towns_defaultThemeId_fkey" FOREIGN KEY ("defaultThemeId") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_detentionCenterId_fkey" FOREIGN KEY ("detentionCenterId") REFERENCES "detention_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_townId_fkey" FOREIGN KEY ("townId") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supporters" ADD CONSTRAINT "supporters_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supporters" ADD CONSTRAINT "supporters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_personHistoryId_fkey" FOREIGN KEY ("personHistoryId") REFERENCES "person_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_support" ADD CONSTRAINT "anonymous_support_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_support" ADD CONSTRAINT "anonymous_support_personHistoryId_fkey" FOREIGN KEY ("personHistoryId") REFERENCES "person_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "town_access" ADD CONSTRAINT "town_access_townId_fkey" FOREIGN KEY ("townId") REFERENCES "towns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "town_access" ADD CONSTRAINT "town_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_access" ADD CONSTRAINT "person_access_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_access" ADD CONSTRAINT "person_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_privacy_settings" ADD CONSTRAINT "family_privacy_settings_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_storage" ADD CONSTRAINT "image_storage_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_images" ADD CONSTRAINT "person_images_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "image_storage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_images" ADD CONSTRAINT "person_images_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detention_center_images" ADD CONSTRAINT "detention_center_images_detentionCenterId_fkey" FOREIGN KEY ("detentionCenterId") REFERENCES "detention_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detention_center_images" ADD CONSTRAINT "detention_center_images_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "image_storage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_history" ADD CONSTRAINT "person_history_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_history" ADD CONSTRAINT "person_history_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_opt_outs" ADD CONSTRAINT "email_opt_outs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_opt_outs" ADD CONSTRAINT "email_opt_outs_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_personHistoryId_fkey" FOREIGN KEY ("personHistoryId") REFERENCES "person_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_opt_out_tokens" ADD CONSTRAINT "email_opt_out_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_opt_out_tokens" ADD CONSTRAINT "email_opt_out_tokens_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_link_tokens" ADD CONSTRAINT "magic_link_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_link_tokens" ADD CONSTRAINT "magic_link_tokens_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_link_tokens" ADD CONSTRAINT "magic_link_tokens_personHistoryId_fkey" FOREIGN KEY ("personHistoryId") REFERENCES "person_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;

