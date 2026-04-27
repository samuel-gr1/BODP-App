# Zemen Bank Fit & Proper System - Mobile App API Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Core APIs](#core-apis)
4. [Meeting Management APIs](#meeting-management-apis)
5. [Form Submission APIs](#form-submission-apis)
6. [Document Management APIs](#document-management-apis)
7. [QR Code Business Card APIs](#qr-code-business-card-apis)
8. [Analytics & Reports APIs](#analytics--reports-apis)
9. [Related Parties Declaration APIs](#related-parties-declaration-apis)
10. [UI/UX Style Guide](#uiux-style-guide)
11. [Mobile App Feature Specifications](#mobile-app-feature-specifications)

---

## System Overview

**Zemen Bank Fit & Proper System** is a comprehensive board and committee management platform with the following core modules:

- **Fit & Proper Assessment**: Multi-section form submission and approval workflow
- **Meeting Management**: Complete meeting lifecycle with agenda, minutes, voting
- **Document Management**: Centralized document library with categorization
- **QR Business Cards**: Digital business card generation and sharing
- **Related Parties Declaration**: Conflict of interest disclosure system
- **User Management**: Role-based access control (ADMIN, APPROVER, SECRETARY, USER)

---

## Authentication & Authorization

### User Roles
| Role | Permissions |
|------|-------------|
| `ADMIN` | Full system access, user management, all approvals |
| `APPROVER` | Review and approve submissions, create meetings |
| `SECRETARY` | Meeting management, minutes creation, attendance tracking |
| `USER` | Submit forms, participate in meetings, view documents |
| `OBSERVER` | View-only access to meetings |

### Authentication Flow

#### 1. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@zemenbank.com",    // or username without domain
  "password": "userpassword"
}
```

**Response:**
```json
{
  "user": {
    "id": "cuid",
    "name": "User Name",
    "email": "user@zemenbank.com",
    "role": "ADMIN"
  }
}
```
**Note:** Sets `auth-token` HTTP-only cookie automatically.

#### 2. Get Current User
```http
GET /api/auth/me
```

**Response:**
```json
{
  "user": {
    "id": "cuid",
    "name": "User Name",
    "email": "user@zemenbank.com",
    "role": "ADMIN"
  }
}
```

#### 3. Refresh Token
```http
POST /api/auth/refresh
```
**Note:** Extends session expiry (30-minute sliding window)

#### 4. Logout
```http
POST /api/auth/logout
```

---

## Core APIs

### User Management APIs

#### List Users (Admin/Approver/Secretary only)
```http
GET /api/users?role=ADMIN&search=john
```

**Response:**
```json
{
  "users": [
    {
      "id": "cuid",
      "name": "John Doe",
      "email": "john@zemenbank.com",
      "role": "ADMIN",
      "createdAt": "2024-01-15T10:00:00Z",
      "meetingParticipants": [...]
    }
  ]
}
```

#### Search Users
```http
GET /api/users/search?q=john&limit=10&exclude=userId1,userId2
```

#### Create User (Admin/Approver only)
```http
POST /api/users
Content-Type: application/json

{
  "name": "New User",
  "email": "newuser@zemenbank.com",
  "role": "USER"
}
```
**Note:** Auto-generates temporary password and sends welcome email.

### Categories (Boards/Committees) APIs

#### List Categories
```http
GET /api/categories?parentId=optional_parent_id
```

**Response:**
```json
{
  "categories": [
    {
      "id": "cuid",
      "name": "Board of Directors",
      "description": "Main board",
      "parentId": null,
      "children": [...],
      "members": [
        {
          "userId": "cuid",
          "role": "CHAIRPERSON",  // BoardRole: CHAIRPERSON, VICE_CHAIR, SECRETARY, TREASURER, MEMBER, OBSERVER
          "user": { "id": "cuid", "name": "...", "email": "..." }
        }
      ],
      "_count": { "meetings": 5, "children": 2 }
    }
  ]
}
```

#### Create Category (Admin/Approver/Secretary)
```http
POST /api/categories
Content-Type: application/json

{
  "name": "Risk Committee",
  "description": "Risk oversight",
  "parentId": "optional_parent_category_id",
  "members": [
    { "userId": "cuid", "role": "CHAIRPERSON" },
    { "userId": "cuid", "role": "MEMBER" }
  ]
}
```

#### Category Members Management
```http
POST /api/categories/{categoryId}/members
Content-Type: application/json

{
  "userId": "cuid",
  "role": "SECRETARY"
}
```

---

## Meeting Management APIs

### Core Meeting APIs

#### List Meetings
```http
GET /api/meetings?categoryId=xxx&status=SCHEDULED&search=annual&from=2024-01-01&to=2024-12-31
```

**Query Parameters:**
- `categoryId` - Filter by committee/board
- `status` - `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `search` - Search title/description
- `from`, `to` - Date range filter

**Response:**
```json
{
  "meetings": [
    {
      "id": "cuid",
      "title": "Q1 Board Meeting",
      "description": "Quarterly review",
      "date": "2024-03-15T10:00:00Z",
      "time": "10:00 AM",
      "location": "Board Room A",
      "status": "SCHEDULED",
      "minuteNumber": "BM-2024-001",
      "quorumDeclaration": "Quorum was declared present...",
      "startTime": "10:05 AM",
      "endTime": "12:30 PM",
      "category": { "id": "cuid", "name": "Board of Directors" },
      "creator": { "id": "cuid", "name": "...", "email": "..." },
      "participants": [
        {
          "id": "cuid",
          "userId": "cuid",
          "role": "PARTICIPANT",
          "meetingRole": "CHAIRPERSON",
          "attended": true,
          "attendanceMode": "IN_PERSON",  // or "VIRTUAL"
          "isDelegated": false,
          "user": { "id": "cuid", "name": "...", "email": "..." }
        }
      ],
      "externalInvitees": [
        { "id": "cuid", "email": "guest@external.com", "name": "Guest", "isAttended": false }
      ],
      "agendaItems": [...],
      "attachments": [...],
      "comments": [...],
      "_count": { "agendaItems": 5, "participants": 8 }
    }
  ]
}
```

#### Create Meeting (Admin/Approver/Secretary)
```http
POST /api/meetings
Content-Type: application/json

{
  "title": "Board Meeting",
  "description": "Monthly board meeting",
  "date": "2024-12-25",
  "time": "10:00 AM",
  "location": "Board Room",
  "categoryId": "category_cuid",
  "minuteNumber": "BM-2024-012",
  "quorumDeclaration": "Quorum: 5 of 7 members present",
  "startTime": "10:00",
  "endTime": "12:00",
  "participants": [
    { "userId": "cuid", "role": "PARTICIPANT" }
  ],
  "externalInvitees": [
    { "email": "guest@example.com", "name": "Guest Speaker" }
  ],
  "agendaItems": [
    {
      "title": "Financial Review",
      "description": "Q4 financial review",
      "presenter": "CFO",
      "duration": 30,
      "notes": "Bring reports"
    }
  ]
}
```

#### Get Single Meeting
```http
GET /api/meetings/{meetingId}
```

#### Update Meeting
```http
PUT /api/meetings/{meetingId}
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "date": "2024-12-26",
  "time": "11:00 AM",
  "location": "New Room",
  "categoryId": "new_category_id",
  "status": "IN_PROGRESS"
}
```

#### Delete Meeting (Admin/Creator only)
```http
DELETE /api/meetings/{meetingId}
```

### Meeting Participants APIs

#### List Participants
```http
GET /api/meetings/{meetingId}/participants
```

#### Add External Invitee
```http
POST /api/meetings/{meetingId}/participants
Content-Type: application/json

{
  "email": "guest@external.com",
  "name": "Guest Name",
  "title": "CEO External Company"
}
```

#### Update Attendance
```http
PATCH /api/meetings/{meetingId}/participants
Content-Type: application/json

{
  "userId": "user_cuid",        // For internal participants
  "inviteeId": "invitee_cuid",  // For external invitees
  "attended": true
}
```

#### Remove External Invitee
```http
DELETE /api/meetings/{meetingId}/participants
Content-Type: application/json

{
  "inviteeId": "invitee_cuid"
}
```

### Agenda Management APIs

#### List Agenda Items
```http
GET /api/meetings/{meetingId}/agenda
```

#### Create Agenda Item
```http
POST /api/meetings/{meetingId}/agenda
Content-Type: application/json

{
  "title": "New Agenda Item",
  "description": "Detailed description",
  "presenter": "Presenter Name",
  "duration": 30,  // minutes
  "notes": "Supporting notes",
  "orderIndex": 2  // optional, auto-calculated if not provided
}
```

### Agenda Item Detail APIs

#### Update Agenda Item
```http
PUT /api/meetings/{meetingId}/agenda-items/{agendaItemId}
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "presenter": "New Presenter",
  "duration": 45,
  "notes": "Updated notes",
  "transcript": "Discussion transcript...",
  "isCompleted": true
}
```

#### Delete Agenda Item
```http
DELETE /api/meetings/{meetingId}/agenda-items/{agendaItemId}
```

#### Manage Attachments
```http
POST /api/agenda-items/{agendaItemId}/attachments
Content-Type: multipart/form-data

file: <binary>
```

```http
GET /api/agenda-items/{agendaItemId}/attachments/{attachmentId}/download
GET /api/agenda-items/{agendaItemId}/attachments/{attachmentId}/view
DELETE /api/agenda-items/{agendaItemId}/attachments/{attachmentId}
```

### Meeting Comments APIs

#### List Comments (Threaded)
```http
GET /api/meetings/{meetingId}/comments
```

**Response:**
```json
{
  "comments": [
    {
      "id": "cuid",
      "content": "Comment text",
      "userId": "cuid",
      "parentId": null,  // null for top-level, parent comment ID for replies
      "createdAt": "2024-01-15T10:00:00Z",
      "user": { "id": "cuid", "name": "...", "email": "..." },
      "replies": [
        {
          "id": "cuid",
          "content": "Reply text",
          "parentId": "parent_comment_id",
          "user": { ... }
        }
      ]
    }
  ]
}
```

#### Create Comment
```http
POST /api/meetings/{meetingId}/comments
Content-Type: application/json

{
  "content": "Comment text here",
  "parentId": "parent_comment_id"  // optional, for replies
}
```

#### Delete Comment (Admin only)
```http
DELETE /api/meetings/{meetingId}/comments?commentId=xxx
```

### Meeting Attachments APIs

#### Upload Meeting Attachment
```http
POST /api/meetings/{meetingId}/attachments
Content-Type: multipart/form-data

file: <binary>
```

#### Delete Meeting Attachment
```http
DELETE /api/meetings/{meetingId}/attachments/{attachmentId}
```

### Resolution & Voting APIs

#### List Resolutions
```http
GET /api/meetings/{meetingId}/resolutions
```

**Response:**
```json
{
  "resolutions": [
    {
      "id": "cuid",
      "title": "Approve Budget",
      "description": "Approve Q1 2024 budget of ETB 50M",
      "proposedBy": "cuid",
      "status": "PROPOSED",  // PROPOSED, APPROVED, REJECTED, COMPLETED
      "votingDeadline": "2024-01-20T17:00:00Z",
      "createdAt": "2024-01-15T10:00:00Z",
      "proposer": { "id": "cuid", "name": "...", "email": "...", "role": "..." },
      "votes": [
        {
          "id": "cuid",
          "userId": "cuid",
          "vote": "YES",  // YES, NO, ABSTAIN
          "comment": "Supporting comment",
          "votedAt": "2024-01-15T11:00:00Z",
          "voter": { "id": "cuid", "name": "...", "email": "...", "role": "..." }
        }
      ],
      "attachments": [...]
    }
  ]
}
```

#### Create Resolution
```http
POST /api/meetings/{meetingId}/resolutions
Content-Type: application/json

{
  "title": "Resolution Title",
  "description": "Detailed description of the resolution",
  "votingDeadline": "2024-12-31T23:59:59Z"  // optional
}
```

#### Cast Vote
```http
POST /api/meetings/{meetingId}/resolutions/{resolutionId}/vote
Content-Type: application/json

{
  "vote": "YES",  // YES, NO, ABSTAIN
  "comment": "Optional reasoning for vote"
}
```

### Minutes Management APIs

#### Get Minutes for Agenda Item
```http
GET /api/meetings/{meetingId}/agenda-items/{agendaItemId}/minutes
```

#### Create/Update Minutes
```http
POST /api/meetings/{meetingId}/agenda-items/{agendaItemId}/minutes
Content-Type: application/json

{
  "content": "Minutes content...",
  "status": "DRAFT"  // DRAFT, PUBLISHED, APPROVED, REJECTED
}
```

#### Approve Minutes
```http
POST /api/meetings/{meetingId}/agenda-items/{agendaItemId}/minutes/approve
Content-Type: application/json

{
  "status": "APPROVED",  // APPROVED, REJECTED, NEEDS_REVISION
  "comment": "Approval comment"
}
```

### Action Items APIs

#### List Action Items
```http
GET /api/meetings/{meetingId}/minutes/{minuteId}/action-items
```

#### Create Action Item
```http
POST /api/meetings/{meetingId}/minutes/{minuteId}/action-items
Content-Type: application/json

{
  "description": "Complete financial report",
  "assignedTo": "user_cuid",
  "dueDate": "2024-02-15",
  "status": "PENDING"  // PENDING, IN_PROGRESS, COMPLETED, OVERDUE
}
```

### Digital Signatures APIs

#### Add Digital Signature
```http
POST /api/meetings/{meetingId}/minutes/{minuteId}/sign
Content-Type: application/json

{
  "signature": "encrypted_signature_data",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mobile App v1.0"
}
```

#### Revoke Signature (Admin only)
```http
POST /api/meetings/{meetingId}/minutes/{minuteId}/sign/{signatureId}/revoke
Content-Type: application/json

{
  "reason": "Reason for revocation"
}
```

---

## Form Submission APIs (Fit & Proper)

### Submission Management

#### List User Submissions
```http
GET /api/form-submissions?submissionId=optional_specific_id
```

**Response:**
```json
{
  "submissions": [
    {
      "id": "cuid",
      "userId": "cuid",
      "version": 1,
      "status": "DRAFT",  // DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, EXPIRED, COMPLETED
      "submittedAt": null,
      "expiresAt": "2025-12-31T23:59:59Z",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### Create New Submission
```http
POST /api/form-submissions
Content-Type: application/json

{
  "action": "create_new"
}
```

#### Update Existing (From Approved)
```http
POST /api/form-submissions
Content-Type: application/json

{
  "action": "update_existing"
}
```

### Form Sections APIs

#### List Form Sections
```http
GET /api/form-sections?submission=submission_id
```

**Response:**
```json
{
  "sections": [
    {
      "id": "cuid",
      "sectionName": "GENERAL_INFO",  // GENERAL_INFO, PERSONAL_INFO, BUSINESS_ACTIVITIES, FINANCIAL_INFORMATION, PROPRIETY_TEST
      "answers": { ... },
      "status": "INCOMPLETE",  // INCOMPLETE, PENDING, APPROVED, REJECTED
      "submissionId": "cuid",
      "comments": [
        {
          "id": "cuid",
          "content": "Approver comment",
          "approver": { "name": "Approver Name" }
        }
      ]
    }
  ],
  "user": {
    "id": "cuid",
    "name": "User Name",
    "email": "user@zemenbank.com"
  }
}
```

#### Save/Update Section
```http
POST /api/form-sections
Content-Type: application/json

{
  "sectionName": "GENERAL_INFO",
  "answers": {
    "bankName": "Zemen Bank",
    "applicantType": "Individual",
    "fullName": "John Doe",
    "dateOfBirth": "1980-01-01",
    "nationality": "Ethiopian",
    "idCardNumber": "ABC123456",
    "idCardIssueDate": "2010-01-01",
    "passportIssueDate": "2015-01-01",
    "taxPayerIdNumber": "TIN123456",
    "street": "123 Main St",
    "city": "Addis Ababa",
    "telephoneNo": "+251911234567",
    "email": "john@example.com",
    "educationalQualification": "Bachelor's Degree",
    "bankers": "Bank of Abyssinia"
  },
  "submissionId": "optional_submission_id"
}
```

### Submission Workflow APIs

#### Submit for Approval
```http
POST /api/form-submissions/submit
Content-Type: application/json

{
  "submissionId": "cuid"
}
```

#### Get Latest Approved Submission
```http
GET /api/form-submissions/latest-approved
```

#### Complete Submission (Final)
```http
POST /api/form-submissions/complete
Content-Type: application/json

{
  "submissionId": "cuid"
}
```

### Update Request APIs

#### Submit Update Request (User)
```http
POST /api/update-requests/submit
Content-Type: application/json

{
  "reason": "Need to update financial information due to new investments made in Q3 2024",
  "sections": ["FINANCIAL_INFORMATION", "BUSINESS_ACTIVITIES"]
}
```

#### List Update Requests
```http
GET /api/update-requests?submissionId=xxx&status=PENDING
```

**Response:**
```json
{
  "requests": [
    {
      "id": "cuid",
      "userId": "cuid",
      "approverId": "cuid",
      "reason": "Reason for update",
      "sections": ["FINANCIAL_INFORMATION"],
      "status": "PENDING",  // PENDING, APPROVED, REJECTED, COMPLETED
      "createdAt": "2024-01-15T10:00:00Z",
      "user": { "name": "...", "email": "..." }
    }
  ]
}
```

#### Approve Update Request (Admin only)
```http
POST /api/update-requests/approve
Content-Type: application/json

{
  "requestId": "cuid"
}
```

**Response:**
```json
{
  "success": true,
  "newSubmissionId": "new_draft_submission_cuid"
}
```

---

## Document Management APIs

### Document Library APIs

#### List Documents
```http
GET /api/documents
```

**Response:**
```json
{
  "documents": [
    {
      "id": "cuid",
      "title": "Policy Document",
      "description": "Bank policy",
      "fileUrl": "filename.pdf",
      "originalName": "original_filename.pdf",
      "mimetype": "application/pdf",
      "size": 1024567,
      "uploadedBy": "cuid",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### Upload Document (Admin only)
```http
POST /api/documents
Content-Type: multipart/form-data

title: Document Title
description: Document description
file: <binary>
```

**Validation:** PDF/Word only, max 25MB

#### Download Document
```http
GET /api/documents/{documentId}/download
```

#### Delete Document (Admin only)
```http
DELETE /api/documents/{documentId}
```

### Document Categories APIs

#### List Categories
```http
GET /api/document-categories
```

#### Create Category
```http
POST /api/document-categories
Content-Type: application/json

{
  "name": "Policies",
  "description": "Bank policies"
}
```

### Document Subcategories APIs

#### List Subcategories
```http
GET /api/document-subcategories
```

#### Create Subcategory
```http
POST /api/document-subcategories
Content-Type: application/json

{
  "categoryId": "parent_category_cuid",
  "name": "HR Policies",
  "description": "HR-related policies"
}
```

### Library Documents APIs

#### List Library Documents
```http
GET /api/library-documents
```

#### Upload Library Document
```http
POST /api/library-documents
Content-Type: multipart/form-data

title: Document Title
description: Description
categoryId: category_cuid
subcategoryId: subcategory_cuid
file: <binary>
```

### Document Review APIs

#### Mark Document as Reviewed
```http
POST /api/documents/{documentId}/review
Content-Type: application/json

{
  "comment": "Reviewed and approved"
}
```

#### Notify Users About Document
```http
POST /api/documents/{documentId}/notify
Content-Type: application/json

{
  "userIds": ["user1_cuid", "user2_cuid"]
}
```

---

## QR Code Business Card APIs

### User QR Profile APIs

#### Get Current User QR Profile
```http
GET /api/qr/user/me
```

**Response:**
```json
{
  "user": {
    "id": "cuid",
    "name": "John Doe",
    "email": "john@zemenbank.com",
    "role": "USER",
    "titleId": "title_cuid",
    "cardData": { ... },
    "title": { "id": "cuid", "name": "Board Member" }
  }
}
```

### QR Cards APIs

#### List User's QR Cards
```http
GET /api/qr/cards
```

**Response:**
```json
{
  "cards": [
    {
      "id": "cuid",
      "slug": "user_cuid-1705312800000",
      "templateId": "template_cuid",
      "data": { ... },
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z",
      "template": {
        "id": "cuid",
        "key": "executive",
        "name": "Executive Template",
        "jsonSchema": { ... }
      },
      "user": {
        "id": "cuid",
        "name": "John Doe",
        "email": "john@zemenbank.com",
        "cardData": { ... }
      }
    }
  ]
}
```

#### Create QR Card
```http
POST /api/qr/cards
Content-Type: application/json

{
  "templateId": "template_cuid",
  "data": {
    "name": "John Doe",
    "title": "Board Member",
    "department": "Governance",
    "phone": "+251911234567",
    "email": "john@zemenbank.com",
    "photo": "data:image/jpeg;base64,..."
  }
}
```

#### Get Single Card (Public)
```http
GET /api/qr/cards/{cardId}
```

#### Delete Card
```http
DELETE /api/qr/cards/{cardId}
```

### QR Templates APIs

#### List Templates
```http
GET /api/qr/templates
```

**Response:**
```json
{
  "templates": [
    {
      "id": "cuid",
      "key": "executive",
      "name": "Executive Template",
      "jsonSchema": { ... },
      "isActive": true
    }
  ]
}
```

### QR Titles APIs

#### List Titles
```http
GET /api/qr/titles
```

### QR Upload API

#### Upload Photo/Attachment
```http
POST /api/qr/upload
Content-Type: multipart/form-data

file: <binary>
```

**Response:**
```json
{
  "dataUrl": "data:image/jpeg;base64,..."
}
```

### QR Admin APIs

#### List QR Users (Admin only)
```http
GET /api/qr/admin/users
```

**Response:**
```json
{
  "users": [...],
  "titles": [
    { "id": "cuid", "name": "Board Member", "isActive": true }
  ]
}
```

#### Update QR User (Admin only)
```http
PUT /api/qr/admin/users/{userId}
Content-Type: application/json

{
  "titleId": "title_cuid",
  "cardData": { ... },
  "isActive": true
}
```

#### Sync Users from Main DB (Admin only)
```http
GET /api/qr/admin/sync/users
```

**Response:**
```json
{
  "added": [...],
  "unadded": [...]
}
```

#### Add Users to QR System (Admin only)
```http
POST /api/qr/admin/sync/add
Content-Type: application/json

{
  "userIds": ["user_cuid_1", "user_cuid_2"]
}
```

#### Remove Users from QR System (Admin only)
```http
POST /api/qr/admin/sync/remove
Content-Type: application/json

{
  "emails": ["user@zemenbank.com"],
  "externalIds": ["external_cuid"],
  "hardDelete": false  // true for permanent deletion
}
```

---

## Analytics & Reports APIs

### Dashboard Metrics APIs

#### Get User Dashboard Metrics
```http
GET /api/dashboard/metrics
```

**Response:**
```json
{
  "totalSubmissions": 5,
  "pendingApproval": 1,
  "approved": 3,
  "rejected": 1
}
```

### Meeting Analytics APIs

#### Get Meeting Analytics (Admin/Secretary only)
```http
GET /api/analytics/meetings?startDate=2024-01-01&endDate=2024-12-31&categoryId=xxx&userId=xxx
```

**Query Parameters:**
- `startDate`, `endDate` - Date range
- `categoryId` - Filter by committee
- `userId` - Filter by participant
- `completionRateMin/Max` - Filter by completion percentage
- `participantsMin/Max` - Filter by participant count
- `searchTerm` - Search meetings

**Response:**
```json
{
  "meetings": [
    {
      "id": "cuid",
      "title": "Board Meeting",
      "analytics": {
        "totalParticipants": 8,
        "agendaItemsCount": 5,
        "completedItems": 4,
        "totalComments": 12,
        "totalAttachments": 3,
        "totalResolutions": 2,
        "totalVotes": 14,
        "completionRate": 80.0,
        "participationRate": 1.5
      }
    }
  ],
  "summary": {
    "totalMeetings": 10,
    "totalParticipants": 80,
    "totalAgendaItems": 50,
    "totalCompletedItems": 40,
    "totalComments": 120,
    "totalAttachments": 30,
    "totalResolutions": 20,
    "totalVotes": 140,
    "averageParticipants": 8.0,
    "averageAgendaItems": 5.0,
    "averageComments": 12.0,
    "overallCompletionRate": 80.0
  },
  "categoryBreakdown": [...]
}
```

### Recent Activity API
```http
GET /api/analytics/recent-activity
```

---

## Related Parties Declaration APIs

### Get Declaration
```http
GET /api/related-parties
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "cuid",
    "userId": "cuid",
    "infoFullName": "Full Legal Name",
    "infoTIN": "TIN123456789",
    "infoRole": "board",  // board, ceo, seo, shareholder, other
    "infoOtherRole": null,  // if role is "other"
    "spouse": {
      "name": "Spouse Name",
      "accountNumbers": ["ACC001", "ACC002"]
    },
    "father": { "name": "...", "accountNumbers": [] },
    "mother": { "name": "...", "accountNumbers": [] },
    "children": [
      { "name": "Child Name", "accountNumbers": [] }
    ],
    "businessAffiliations": [
      {
        "fullName": "Affiliate Name",
        "companyName": "Company Ltd",
        "shareholdingPercentage": 25,
        "relationshipType": "family",
        "companyType": "private"
      }
    ],
    "locked": true,
    "submittedAt": "2024-01-15T10:00:00Z"
  }
}
```

### Submit Declaration (First Time)
```http
POST /api/related-parties
Content-Type: application/json

{
  "infoFullName": "Full Legal Name",
  "infoTIN": "TIN123456789",
  "infoRole": "board",
  "spouse": { "name": "Spouse Name", "accountNumbers": [] },
  "father": { "name": "Father Name", "accountNumbers": [] },
  "mother": { "name": "Mother Name", "accountNumbers": [] },
  "children": [],
  "businessAffiliations": []
}
```

**Note:** Once submitted, declaration is locked. To update, request unlock via update request.

### Update Declaration (When Unlocked)
```http
PATCH /api/related-parties
Content-Type: application/json

{
  "infoFullName": "Updated Name",
  "infoTIN": "TIN123456789",
  "infoRole": "ceo",
  // ... all other fields
}
```

### Admin Related Parties APIs

#### Get Analytics
```http
GET /api/admin/related-parties/analytics
```

#### Export Declaration
```http
GET /api/admin/related-parties/export/{userId}
```

#### Approve Update Request
```http
POST /api/admin/related-parties/update-requests/{requestId}/approve
```

#### Reject Update Request
```http
POST /api/admin/related-parties/update-requests/{requestId}/reject
Content-Type: application/json

{
  "reason": "Reason for rejection"
}
```

---

## Approver APIs

### Get Submissions for Review
```http
GET /api/approver/submissions
```

### Get User Submission Detail
```http
GET /api/approver/submissions/{userId}
```

### Approve Submission
```http
POST /api/approver/approve
Content-Type: application/json

{
  "submissionId": "cuid",
  "comment": "Approved - all requirements met"
}
```

### Reject Submission
```http
POST /api/approver/reject
Content-Type: application/json

{
  "submissionId": "cuid",
  "comment": "Rejected - missing financial documents"
}
```

### Add Comment to Submission
```http
POST /api/approver/comments
Content-Type: application/json

{
  "sectionId": "cuid",
  "content": "Please provide more details about..."
}
```

### Archive Submission
```http
POST /api/approver/archive
Content-Type: application/json

{
  "submissionId": "cuid"
}
```

### Export Approved Submissions
```http
GET /api/approver/export-approved?categoryId=xxx
```

---

## File Management APIs

### Download File
```http
GET /api/files/{filename}
```

### Delete File
```http
DELETE /api/files/delete
Content-Type: application/json

{
  "filename": "file.pdf"
}
```

### Download from Alternative Endpoint
```http
GET /api/files/download?filename=file.pdf
```

---

## UI/UX Style Guide

### Color Palette (CSS Variables)

```css
/* Light Mode (Default) */
:root {
  --background: 0 0% 100%;           /* #FFFFFF - Pure White */
  --foreground: 222.2 84% 4.9%;     /* #0F172A - Near Black */
  --card: 0 0% 100%;                 /* #FFFFFF - Card Background */
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  
  /* Primary Colors - Zemen Bank Brand */
  --primary: 222.2 47.4% 11.2%;     /* #1E293B - Slate 800 */
  --primary-foreground: 210 40% 98%;
  
  /* Secondary Colors */
  --secondary: 210 40% 96%;          /* #F1F5F9 - Slate 100 */
  --secondary-foreground: 222.2 84% 4.9%;
  
  /* Muted/Subtle */
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;  /* #64748B - Slate 500 */
  
  /* Accent */
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  
  /* Destructive/Error */
  --destructive: 0 84.2% 60.2%;     /* #EF4444 - Red 500 */
  --destructive-foreground: 210 40% 98%;
  
  /* Borders */
  --border: 214.3 31.8% 91.4%;      /* #E2E8F0 - Slate 200 */
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  
  /* Chart Colors */
  --chart-1: 12 76% 61%;            /* #E76B50 - Orange-Red */
  --chart-2: 173 58% 39%;          /* #2A9D8F - Teal */
  --chart-3: 197 37% 24%;          /* #264653 - Dark Blue-Green */
  --chart-4: 43 74% 66%;            /* #E9C46A - Yellow */
  --chart-5: 27 87% 67%;            /* #F4A261 - Orange */
  
  /* Sidebar */
  --sidebar-background: 0 0% 98%;
  --sidebar-foreground: 240 5.3% 26.1%;
  --sidebar-primary: 240 5.9% 10%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 240 4.8% 95.9%;
  --sidebar-accent-foreground: 240 5.9% 10%;
  --sidebar-border: 220 13% 91%;
  --sidebar-ring: 217.2 91.2% 59.8%;
  
  --radius: 0.5rem;  /* 8px border radius */
}

/* Dark Mode */
.dark {
  --background: 222.2 84% 4.9%;     /* #0F172A - Slate 900 */
  --foreground: 210 40% 98%;        /* #F8FAFC - Slate 50 */
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
  --chart-1: 220 70% 50%;
  --chart-2: 160 60% 45%;
  --chart-3: 30 80% 55%;
  --chart-4: 280 65% 60%;
  --chart-5: 340 75% 55%;
}
```

### Mobile App Specific Colors
```css
/* Status Colors */
--status-scheduled: 217 91% 60%;     /* Blue - Scheduled */
--status-in-progress: 38 92% 50%;    /* Orange - In Progress */
--status-completed: 142 76% 36%;     /* Green - Completed */
--status-cancelled: 0 84% 60%;       /* Red - Cancelled */

/* Priority Colors */
--priority-high: 0 84% 60%;           /* Red */
--priority-medium: 38 92% 50%;      /* Orange */
--priority-low: 142 76% 36%;        /* Green */

/* Vote Colors */
--vote-yes: 142 76% 36%;            /* Green */
--vote-no: 0 84% 60%;               /* Red */
--vote-abstain: 215 20% 65%;        /* Gray */
```

### Typography

```css
/* Font Stack */
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

/* Mobile Font Sizes */
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
```

### Spacing Scale
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
```

### Border Radius
```css
--radius-sm: calc(var(--radius) - 4px);   /* 4px */
--radius-md: calc(var(--radius) - 2px);   /* 6px */
--radius-lg: var(--radius);               /* 8px */
--radius-xl: calc(var(--radius) + 4px);   /* 12px */
--radius-full: 9999px;
```

### Shadow Scale (Mobile Optimized)
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

---

## Mobile App Feature Specifications

### 1. Authentication & Onboarding

#### Login Screen
- Email/username input field
- Password input with visibility toggle
- Biometric authentication option (Face ID/Touch ID)
- "Remember me" checkbox
- Forgot password link
- Company branding with Zemen Bank logo

#### Session Management
- 30-minute idle timeout with auto-refresh
- Secure token storage (Keychain/Keystore)
- Automatic token refresh before expiry
- Secure logout with token cleanup

### 2. Dashboard/Home Screen

#### Layout
```
┌─────────────────────────────┐
│  Zemen Bank Fit & Proper    │
│  👤 Welcome, [User Name]    │
├─────────────────────────────┤
│  📊 Quick Stats              │
│  ┌────────┬────────┐        │
│  │Pending │Approved│        │
│  │   2    │   5    │        │
│  └────────┴────────┘        │
├─────────────────────────────┤
│  📅 Upcoming Meetings        │
│  • Board Meeting - Dec 25   │
│  • Risk Committee - Dec 28    │
├─────────────────────────────┤
│  🔔 Notifications            │
│  • New meeting invitation   │
│  • Form approved            │
└─────────────────────────────┘
```

#### Features
- Quick action buttons (Create Meeting, Submit Form, Scan QR)
- Swipeable meeting cards
- Pull-to-refresh
- Notification badge count

### 3. Meeting Management Module

#### Meeting List Screen
- Filter tabs: All | Scheduled | In Progress | Completed
- Search bar with real-time filtering
- Sort options: Date, Title, Category
- List/Calendar view toggle
- Swipe actions: Edit (creator/admin), Delete (admin)

#### Meeting Detail Screen
```
┌─────────────────────────────┐
│  ← Board Meeting - Dec 25   │
├─────────────────────────────┤
│  📍 Location: Board Room A    │
│  🕐 Time: 10:00 AM - 12:00 PM│
│  📋 Status: Scheduled       │
├─────────────────────────────┤
│  👥 Participants (8)          │
│  [Avatar Row] +5 more        │
├─────────────────────────────┤
│  📋 Agenda Items (5)          │
│  • Financial Review          │
│  • Risk Assessment           │
│  • [Expandable List]         │
├─────────────────────────────┤
│  🗳️ Resolutions (2)           │
│  • Approve Budget           │
│  • [Vote Button]           │
├─────────────────────────────┤
│  💬 Comments                │
│  [Threaded Discussion]      │
├─────────────────────────────┤
│  📎 Attachments (3)          │
│  [File Preview Grid]        │
└─────────────────────────────┘
```

#### Create/Edit Meeting
- Step 1: Basic Info (Title, Description, Date, Time, Location)
- Step 2: Select Committee/Board
- Step 3: Add Participants (search users)
- Step 4: Add Agenda Items (reorderable list)
- Step 5: Review & Submit

#### Meeting Actions (In-Meeting)
- **Attendance Tracking**: Mark participants as present/absent
- **Agenda Progress**: Mark items as completed
- **Live Minutes**: Real-time collaborative minutes editing
- **Voting**: Cast votes on resolutions
- **Comments**: Threaded discussions

### 4. Voting & Resolutions Module

#### Resolution List
- Filter: Active | Closed | All
- Sort: Newest | Deadline | Most Voted
- Visual indicators: Vote count, deadline countdown

#### Resolution Detail
```
┌─────────────────────────────┐
│  ← Approve Q1 Budget        │
├─────────────────────────────┤
│  Proposed by: John Doe       │
│  Deadline: 2 days left        │
├─────────────────────────────┤
│  Description                 │
│  Approve Q1 2024 budget...   │
├─────────────────────────────┤
│  📊 Current Results          │
│  ✅ YES: 5 votes (62.5%)     │
│  ❌ NO: 2 votes (25%)        │
│  ⚪ ABSTAIN: 1 vote (12.5%) │
│  [Progress Bar]              │
├─────────────────────────────┤
│  🗳️ Cast Your Vote           │
│  [YES] [NO] [ABSTAIN]        │
├─────────────────────────────┤
│  💬 Vote Comments (3)        │
│  [Expandable List]           │
└─────────────────────────────┘
```

#### Vote Flow
1. View resolution details
2. Tap vote option (YES/NO/ABSTAIN)
3. Optional comment input
4. Confirm with digital signature/PIN
5. View updated results in real-time

### 5. Chat & Communication Module

#### Individual Chat
- Direct messaging between users
- Message status: Sent | Delivered | Read
- File attachments (images, documents)
- Voice messages
- Search message history

#### Group Chat (Committee/Meeting)
- Committee-level group chats
- Meeting-specific temporary chats
- Member list with roles
- Admin controls (add/remove members)
- Mute notifications option

#### Chat Features
```
┌─────────────────────────────┐
│  ← Board of Directors       │
│  8 members • 3 online         │
├─────────────────────────────┤
│  [Message Bubbles]           │
│                              │
│  John Doe                    │
│  Meeting starts in 10 min   │
│                    9:50 AM   │
│                              │
│                   Jane Smith │
│   I'll be joining virtually │
│   9:52 AM ✓✓                │
│                              │
├─────────────────────────────┤
│  [📎] Type a message... [🎙]│
└─────────────────────────────┘
```

### 6. Notifications Module

#### Notification Types
1. **Meeting Notifications**
   - New meeting invitation
   - Meeting reminder (24h, 1h before)
   - Meeting updated/cancelled
   - Agenda item added/updated

2. **Form Notifications**
   - Form submitted confirmation
   - Form approved/rejected
   - Update request approved
   - Form expiry reminder

3. **Resolution Notifications**
   - New resolution to vote
   - Voting reminder
   - Resolution passed/rejected
   - Vote results available

4. **Document Notifications**
   - New document uploaded
   - Document review request
   - Document category update

5. **Chat Notifications**
   - New direct message
   - New group message
   - Mentioned in chat

#### Notification Settings
```
┌─────────────────────────────┐
│  ⚙️ Notification Settings    │
├─────────────────────────────┤
│  📅 Meetings                 │
│  Push: [✓]  Email: [✓]      │
│                              │
│  📋 Forms                    │
│  Push: [✓]  Email: [ ]      │
│                              │
│  🗳️ Voting                   │
│  Push: [✓]  Email: [✓]      │
│                              │
│  💬 Chat                     │
│  Push: [✓]  Email: [ ]      │
│                              │
│  📄 Documents                │
│  Push: [ ]  Email: [✓]      │
└─────────────────────────────┘
```

### 7. Form Submission Module (Fit & Proper)

#### Form Sections
1. **General Information**
   - Personal details
   - Contact information
   - Identification details

2. **Personal Information**
   - Source of funds
   - Financial institutions

3. **Business Activities**
   - Business description
   - Shareholding details
   - Borrowing information

4. **Financial Information**
   - Assets & liabilities
   - Annual income
   - Financial statements (for legal persons)

5. **Propriety Test**
   - 15+ compliance questions
   - Yes/No/Explanation format

#### Form Flow
```
┌─────────────────────────────┐
│  Fit & Proper Assessment     │
│  Step 2 of 5                 │
├─────────────────────────────┤
│  📋 Personal Information     │
│  Status: In Progress [43%]   │
├─────────────────────────────┤
│  Source of Funds *           │
│  [Dropdown Selection]        │
│                              │
│  Financial Institutions *    │
│  [+ Add Institution]         │
│  • Bank of Abyssinia [🗑]   │
│  • Awash International [🗑] │
├─────────────────────────────┤
│  [Save Draft]  [Continue →]  │
└─────────────────────────────┘
```

#### Features
- Progress indicator per section
- Auto-save drafts
- Required field validation
- Document attachment per section
- Approver comments visibility
- Version history

### 8. QR Business Card Module

#### Card Gallery
```
┌─────────────────────────────┐
│  📇 My Business Cards        │
├─────────────────────────────┤
│  ┌───────────────────────┐   │
│  │ [QR Code Preview]     │   │
│  │ Executive Template      │   │
│  │ John Doe                │   │
│  │ Board Member            │   │
│  │ [Share] [Delete]        │   │
│  └───────────────────────┘   │
│                              │
│  [+ Create New Card]        │
└─────────────────────────────┘
```

#### Create Card Flow
1. Select template (Executive, Standard, Minimal)
2. Fill card data (name, title, department, phone, email)
3. Upload photo (optional)
4. Preview QR code
5. Save and share options

#### Share Options
- Generate QR code image
- Share via native share sheet
- Copy public URL
- Save to device photos

### 9. Related Parties Declaration Module

#### Declaration Form
```
┌─────────────────────────────┐
│  Related Parties Declaration │
├─────────────────────────────┤
│  🔒 Status: Locked          │
│  Submitted: Jan 15, 2024    │
├─────────────────────────────┤
│  Your Information            │
│  • Full Name: [View]         │
│  • TIN: [View]               │
│  • Role: Board Member        │
├─────────────────────────────┤
│  Family Members              │
│  • Spouse: [Name]           │
│  • Father: [Name]           │
│  • Mother: [Name]           │
│  • Children: [2]            │
├─────────────────────────────┤
│  Business Affiliations       │
│  • [3 Affiliations]         │
├─────────────────────────────┤
│  [Request Update]            │
└─────────────────────────────┘
```

#### Features
- View-only when locked
- Request update flow
- Status tracking
- Export declaration as PDF

### 10. Document Library Module

#### Document Browser
- Category/Subcategory tree navigation
- Grid/List view toggle
- Search with filters
- Recent documents section
- Favorites/bookmarks

#### Document Viewer
- In-app PDF viewer
- Download for offline access
- Share document link
- Add to favorites
- Mark as reviewed

### 11. Analytics & Reports Module

#### Meeting Analytics
```
┌─────────────────────────────┐
│  📊 Meeting Analytics        │
├─────────────────────────────┤
│  Period: [Last 30 Days ▼]   │
├─────────────────────────────┤
│  Total Meetings: 12          │
│  Avg Participants: 7.5       │
│  Completion Rate: 82%        │
├─────────────────────────────┤
│  [Bar Chart: Meetings/Month]│
├─────────────────────────────┤
│  Top Participants:           │
│  1. John Doe (10 meetings)   │
│  2. Jane Smith (9 meetings)  │
└─────────────────────────────┘
```

#### Report Types
- Meeting attendance report
- Voting participation report
- Form submission status
- Document access audit
- User activity logs

### 12. Offline Capabilities

#### Offline Features
- View cached meetings
- Access downloaded documents
- Draft form submissions (sync when online)
- View cached QR cards
- Read cached messages

#### Sync Strategy
- Background sync when connection restored
- Conflict resolution (server wins)
- Queue for failed actions
- Sync status indicator

### 13. Security Features

#### Security Measures
- PIN/Biometric app lock
- Screenshot prevention (sensitive screens)
- Certificate pinning
- Jailbreak/root detection
- Automatic logout on inactivity
- Secure clipboard handling

#### Data Protection
- Local data encryption (AES-256)
- Secure API communication (TLS 1.3)
- No sensitive data in logs
- Automatic cache clearing on logout

---

## Data Models Reference

### User
```typescript
interface User {
  id: string;              // CUID
  email: string;           // Unique
  name: string;
  role: Role;              // ADMIN | APPROVER | SECRETARY | USER | OBSERVER
  createdAt: Date;
  updatedAt: Date;
}
```

### Meeting
```typescript
interface Meeting {
  id: string;
  title: string;
  description?: string;
  date: Date;
  time: string;
  location?: string;
  categoryId?: string;
  createdBy: string;
  status: MeetingStatus;  // SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
  minuteNumber?: string;
  quorumDeclaration?: string;
  startTime?: string;
  endTime?: string;
  participants: MeetingParticipant[];
  externalInvitees: MeetingExternalInvitee[];
  agendaItems: AgendaItem[];
  attachments: MeetingAttachment[];
  comments: MeetingComment[];
  resolutions: Resolution[];
}
```

### MeetingParticipant
```typescript
interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  role: ParticipantRole;      // SECRETARY | PARTICIPANT | OBSERVER
  meetingRole?: MeetingRole;  // CHAIRPERSON | SECRETARY | MEMBER | OBSERVER
  attended?: boolean;
  attendanceMode: AttendanceMode; // IN_PERSON | VIRTUAL
  isDelegated: boolean;
  delegateeName?: string;
  user: User;
}
```

### AgendaItem
```typescript
interface AgendaItem {
  id: string;
  meetingId: string;
  title: string;
  description?: string;
  presenter?: string;
  duration?: number;     // minutes
  notes?: string;
  orderIndex: number;
  transcript?: string;
  transcriptVersion: number;
  isCompleted: boolean;
  minutes?: Minute[];
  attachments: AgendaItemAttachment[];
  comments: AgendaItemComment[];
}
```

### Resolution & Vote
```typescript
interface Resolution {
  id: string;
  meetingId: string;
  title: string;
  description: string;
  proposedBy: string;
  status: ResolutionStatus;  // PROPOSED | APPROVED | REJECTED | COMPLETED
  votingDeadline?: Date;
  votes: Vote[];
  attachments: ResolutionAttachment[];
}

interface Vote {
  id: string;
  resolutionId: string;
  userId: string;
  vote: VoteType;  // YES | NO | ABSTAIN
  comment?: string;
  votedAt: Date;
  voter: User;
}
```

### FormSubmission
```typescript
interface FormSubmission {
  id: string;
  userId: string;
  version: number;
  status: FormSubmissionStatus;  // DRAFT | SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED | EXPIRED | COMPLETED
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  expiresAt?: Date;
  isActive: boolean;
  createdFromUpdateRequestId?: string;
  sections: FormSection[];
}
```

### FormSection
```typescript
interface FormSection {
  id: string;
  userId: string;
  sectionName: FormSectionName;  // GENERAL_INFO | PERSONAL_INFO | BUSINESS_ACTIVITIES | FINANCIAL_INFORMATION | PROPRIETY_TEST
  answers: Json;
  status: FormSectionStatus;     // INCOMPLETE | PENDING | APPROVED | REJECTED
  submissionId?: string;
  comments: Comment[];
}
```

### RelatedPartiesDeclaration
```typescript
interface RelatedPartiesDeclaration {
  id: string;
  userId: string;
  infoFullName: string;
  infoTIN: string;
  infoRole: string;  // board | ceo | seo | shareholder | other
  infoOtherRole?: string;
  spouse: { name: string; accountNumbers: string[] };
  father: { name: string; accountNumbers: string[] };
  mother: { name: string; accountNumbers: string[] };
  children: Array<{ name: string; accountNumbers: string[] }>;
  businessAffiliations: Array<{
    fullName: string;
    companyName: string;
    shareholdingPercentage: number;
    relationshipType: string;
    companyType: string;
  }>;
  locked: boolean;
  submittedAt: Date;
  updatedAt: Date;
}
```

### QRCard
```typescript
interface QRCard {
  id: string;
  slug: string;
  templateId: string;
  data: Json;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  template: QRTemplate;
  user: QRUser;
}

interface QRTemplate {
  id: string;
  key: string;
  name: string;
  jsonSchema: Json;
  isActive: boolean;
}
```

### Document
```typescript
interface Document {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedBy: string;
  createdAt: Date;
  uploader: User;
}
```

---

## Error Handling

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not logged in |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 409 | Conflict - Duplicate or state conflict |
| 423 | Locked - Resource is locked |
| 500 | Internal Server Error |

### Error Response Format
```json
{
  "error": "Descriptive error message",
  "details": {} // Optional additional details
}
```

### Common Error Scenarios
- **Invalid credentials** → 401
- **Duplicate email** → 409
- **Section locked** → 423
- **Pending update request exists** → 409
- **No approved submission to update from** → 404

---

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- General API: 100 requests per minute
- File uploads: 10 uploads per minute
- Search: 30 searches per minute

---

## WebSocket / Real-time (Future)

For mobile app real-time features, implement:

### Connection
```javascript
// Socket.IO or WebSocket connection
const socket = io('wss://api.zemenbank.com', {
  auth: { token: authToken }
});
```

### Events to Subscribe
- `meeting:updated` - Meeting details changed
- `resolution:voted` - New vote cast
- `comment:added` - New comment posted
- `agenda:completed` - Agenda item marked complete
- `notification:new` - New notification received

### Events to Emit
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `presence:online` - User came online
- `presence:offline` - User went offline

---

## Mobile App Architecture Recommendations

### Tech Stack Suggestions
- **React Native** or **Flutter** for cross-platform
- **Expo** for rapid development (React Native)
- **Provider/Riverpod** for state management
- **Hive/SharedPreferences** for local storage
- **Dio** for HTTP requests
- **Socket.IO Client** for real-time
- **Firebase Cloud Messaging** for push notifications

### Project Structure
```
src/
├── api/              # API clients and interceptors
├── components/       # Reusable UI components
├── constants/        # Colors, sizes, enums
├── hooks/            # Custom React hooks
├── models/           # TypeScript interfaces
├── navigation/       # Navigation configuration
├── screens/          # Screen components
│   ├── auth/
│   ├── dashboard/
│   ├── meetings/
│   ├── forms/
│   ├── documents/
│   ├── chat/
│   └── settings/
├── services/         # Business logic services
├── stores/           # State management (Zustand/Redux)
├── utils/            # Helper functions
└── assets/           # Images, fonts
```

### Key Libraries
- `@react-navigation/native` - Navigation
- `react-native-gifted-chat` - Chat UI
- `react-native-calendars` - Calendar views
- `react-native-pdf` - PDF viewing
- `react-native-qrcode-svg` - QR generation
- `@react-native-community/netinfo` - Network status
- `react-native-biometrics` - Biometric auth

---

## Development Guidelines

### API Client Configuration
```typescript
// api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.zemenbank.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
});

// Request interceptor for auth token
apiClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await refreshToken();
      return apiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

### Error Boundary
```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to crash reporting service
    console.error('App Error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallbackScreen />;
    }
    return this.props.children;
  }
}
```

---

## Appendix: Environment Configuration

### Development
```bash
API_BASE_URL=https://dev-api.zemenbank.com
AUTH_MODE=local  # For local auth bypass
```

### Production
```bash
API_BASE_URL=https://api.zemenbank.com
AUTH_MODE=ldap   # For LDAP authentication
LDAP_URL=ldaps://dc.zemenbank.local
LDAP_BASE_DN=dc=zemenbank,dc=local
```

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Author:** System Documentation Team  
**Reviewers:** Engineering, Security, Product
