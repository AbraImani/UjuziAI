# Firestore Schema Design

## Collections

### `users` (Collection)
```
users/{userId}
├── uid: string
├── email: string
├── displayName: string
├── role: 'student' | 'admin'
├── createdAt: Timestamp
├── updatedAt: Timestamp
├── totalScore: number           // Cumulative score across all modules
├── completedModules: string[]   // Array of completed module IDs
├── badges: string[]             // Array of earned badge IDs
├── rank: number | null          // Global leaderboard rank
│
├── progress/{moduleId}          // Subcollection
│   ├── moduleId: string
│   ├── submissionId: string | null
│   ├── submitted: boolean
│   ├── submittedAt: Timestamp | null
│   ├── validated: boolean       // Admin validated the submission
│   ├── examUnlocked: boolean
│   ├── examScore: number | null // Final exam score (0-10)
│   ├── examAttempts: number     // Counter (max 2)
│   ├── examLocked: boolean      // Locked due to violations
│   ├── badgeId: string | null   // Unique verifiable badge ID
│   ├── completedAt: Timestamp | null
│   ├── lastExamAt: Timestamp | null
│   ├── reviewedAt: Timestamp | null
│   └── reviewedBy: string | null
│
└── submissions/{submissionId}   // Subcollection
    ├── userId: string
    ├── moduleId: string
    ├── images: string[]         // Firebase Storage URLs
    ├── videoUrl: string | null
    ├── description: string
    ├── status: 'pending' | 'approved' | 'rejected'
    ├── submittedAt: Timestamp
    ├── reviewedAt: Timestamp | null
    └── reviewedBy: string | null
```

### `exams` (Collection)
```
exams/{examId}
├── userId: string
├── moduleId: string
├── startedAt: Timestamp
├── completedAt: Timestamp | null
├── status: 'in-progress' | 'completed' | 'graded'
├── answers: Array
│   └── [index]
│       ├── answer: any          // MCQ index or open text
│       ├── questionType: 'mcq' | 'open'
│       └── submittedAt: string
├── mcqScore: number | null      // Score out of 10
├── openScore: number | null     // Score out of 10
├── totalScore: number | null    // Average of mcq + open
├── aiCheatingFlags: number      // AI cheating detection count
├── evaluationDetails: Object    // Detailed grading breakdown
└── gradedAt: Timestamp | null
```

### `moduleSettings` (Collection)
```
moduleSettings/{moduleId}
├── isOpen: boolean              // Admin can open/close codelabs
├── updatedAt: Timestamp
└── customConfig: Object | null  // Optional per-module settings
```

### `badges` (Collection) - For public verification
```
badges/{badgeId}
├── userId: string
├── moduleId: string
├── score: number
├── issuedAt: Timestamp
└── verified: boolean
```

## Indexes Required

1. `exams` - userId (ASC) + moduleId (ASC) + startedAt (DESC)
2. `users` - totalScore (DESC) for leaderboard
3. `users/{uid}/progress` - examScore (DESC)

## Security Model

- Users can only read/write their own data
- Admin role verified via Firestore user document
- Exam attempt counter is server-enforced
- Badge IDs are unique UUIDs generated server-side
- Progress updates are restricted (no client can set examScore)
