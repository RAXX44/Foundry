# Foundry - Visual Architecture Summary

This document provides visual representations of the Foundry application architecture and workflows.

## System Overview

```mermaid
graph TB
    subgraph "Frontend - Next.js 14"
        A[Upload Page] --> B[Image Uploader]
        B --> C[Preview Page]
        C --> D[Schema Editor]
        D --> E[Code Preview]
        E --> F[Download Manager]
    end
    
    subgraph "API Layer"
        G[/api/analyze-erd]
        H[/api/generate-schema]
        I[/api/generate-routes]
    end
    
    subgraph "Services"
        J[watsonx.ai Client]
        K[Vision Service]
        L[ERD Parser]
        M[Prisma Generator]
        N[Route Generator]
    end
    
    subgraph "External"
        O[watsonx.ai API]
    end
    
    B --> G
    G --> J
    J --> O
    O --> K
    K --> L
    L --> C
    
    D --> H
    H --> M
    M --> E
    
    D --> I
    I --> N
    N --> E
    
    E --> F
```

## Complete User Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Upload UI
    participant API as API Routes
    participant Watson as watsonx.ai
    participant Parser as ERD Parser
    participant Editor as Schema Editor
    participant Gen as Generators
    participant Download as Download Manager

    User->>UI: Upload ERD Image
    UI->>API: POST /api/analyze-erd
    API->>Watson: Analyze Image
    Watson-->>API: AI Response
    API->>Parser: Parse Response
    Parser-->>API: Structured Schema
    API-->>UI: Schema Data
    UI->>Editor: Display Schema
    
    User->>Editor: Review/Edit Schema
    Editor->>Editor: Modify Entities
    Editor->>Editor: Adjust Relationships
    
    User->>Editor: Click Generate
    Editor->>API: POST /api/generate-schema
    API->>Gen: Generate Prisma Schema
    Gen-->>API: schema.prisma
    
    Editor->>API: POST /api/generate-routes
    API->>Gen: Generate API Routes
    Gen-->>API: Route Files
    
    API-->>Editor: All Generated Files
    Editor->>Download: Show Files
    
    User->>Download: Download Files
    Download-->>User: ZIP Archive
```

## Data Flow Architecture

```mermaid
flowchart LR
    A[ERD Image] --> B[Base64 Encoding]
    B --> C[watsonx.ai Vision API]
    C --> D[AI Text Response]
    D --> E{Parse JSON}
    E -->|Success| F[Validated Schema]
    E -->|Failure| G[Error Handler]
    F --> H[Schema Editor State]
    H --> I{User Action}
    I -->|Edit| H
    I -->|Generate| J[File Generators]
    J --> K[schema.prisma]
    J --> L[API Routes]
    K --> M[Download ZIP]
    L --> M
```

## Component Hierarchy

```mermaid
graph TD
    A[App Layout] --> B[Home Page]
    A --> C[Preview Page]
    
    B --> D[Header]
    B --> E[ImageUploader]
    B --> F[Features Section]
    B --> G[Footer]
    
    C --> H[Header]
    C --> I[Image Display]
    C --> J[SchemaEditor]
    C --> K[GenerationPanel]
    
    J --> L[EntityCard]
    J --> M[RelationshipEditor]
    L --> N[FieldEditor]
    
    K --> O[CodePreview]
    K --> P[FileDownloader]
    
    O --> Q[Tabs]
    Q --> R[PrismaTab]
    Q --> S[RoutesTabs]
```

## File Generation Process

```mermaid
flowchart TD
    A[Edited Schema] --> B{Generate Schema?}
    B -->|Yes| C[Prisma Generator]
    C --> D[Build Datasource Block]
    D --> E[Build Generator Block]
    E --> F[For Each Entity]
    F --> G[Generate Model Block]
    G --> H[Add Fields]
    H --> I[Add Relationships]
    I --> J[Add Constraints]
    J --> K[Format Code]
    K --> L[schema.prisma File]
    
    A --> M{Generate Routes?}
    M -->|Yes| N[Route Generator]
    N --> O[For Each Entity]
    O --> P[Generate GET All]
    O --> Q[Generate GET by ID]
    O --> R[Generate POST]
    O --> S[Generate PUT]
    O --> T[Generate DELETE]
    P --> U[Combine Routes]
    Q --> U
    R --> U
    S --> U
    T --> U
    U --> V[API Route Files]
    
    L --> W[Package Files]
    V --> W
    W --> X[Create ZIP]
    X --> Y[Download]
```

## Schema Editor State Management

```mermaid
stateDiagram-v2
    [*] --> Empty
    Empty --> Loading: Upload Image
    Loading --> Parsed: AI Analysis Complete
    Parsed --> Editing: User Modifies
    Editing --> Editing: Add/Remove Entity
    Editing --> Editing: Edit Fields
    Editing --> Editing: Modify Relationships
    Editing --> Validating: Click Generate
    Validating --> Valid: Validation Pass
    Validating --> Editing: Validation Fail
    Valid --> Generating: Start Generation
    Generating --> Complete: Files Ready
    Complete --> [*]: Download
    Complete --> Editing: Edit More
```

## API Route Structure

```mermaid
graph LR
    A[API Routes] --> B[/api/analyze-erd]
    A --> C[/api/generate-schema]
    A --> D[/api/generate-routes]
    
    B --> E[POST: Upload & Analyze]
    C --> F[POST: Generate Prisma]
    D --> G[POST: Generate Routes]
    
    E --> H[watsonx.ai Service]
    F --> I[Prisma Generator]
    G --> J[Route Generator]
    
    H --> K[Vision Model]
    I --> L[Template Engine]
    J --> L
```

## Entity Relationship Example

```mermaid
erDiagram
    USER ||--o{ POST : creates
    USER ||--o{ COMMENT : writes
    POST ||--o{ COMMENT : has
    USER {
        int id PK
        string email UK
        string name
        datetime createdAt
    }
    POST {
        int id PK
        string title
        string content
        int authorId FK
        datetime createdAt
    }
    COMMENT {
        int id PK
        string text
        int userId FK
        int postId FK
        datetime createdAt
    }
```

## Prisma Schema Generation Flow

```mermaid
flowchart TD
    A[Entity: User] --> B[Generate Model Block]
    B --> C[Add id Field]
    C --> D[Add email Field]
    D --> E[Add name Field]
    E --> F[Add createdAt Field]
    F --> G[Add Relationships]
    G --> H[posts Post array]
    G --> I[comments Comment array]
    H --> J[Complete User Model]
    I --> J
    
    K[Relationship: User-Post] --> L{Type?}
    L -->|one-to-many| M[Add posts field to User]
    M --> N[Add author field to Post]
    N --> O[Add @relation directive]
    O --> P[Set onDelete behavior]
```

## Error Handling Flow

```mermaid
flowchart TD
    A[User Action] --> B{Validation}
    B -->|Pass| C[Execute Action]
    B -->|Fail| D[Show Validation Error]
    D --> E[User Corrects]
    E --> A
    
    C --> F{API Call}
    F -->|Success| G[Update UI]
    F -->|Network Error| H[Show Retry Option]
    F -->|Server Error| I[Show Error Message]
    
    H --> J{User Retries?}
    J -->|Yes| C
    J -->|No| K[Cancel Action]
    
    I --> L[Log Error]
    L --> M[Show Support Info]
```

## File Download Process

```mermaid
sequenceDiagram
    participant User
    participant UI as Download UI
    participant Gen as Generators
    participant ZIP as JSZip
    participant Browser

    User->>UI: Click Download All
    UI->>Gen: Request All Files
    Gen-->>UI: schema.prisma
    Gen-->>UI: Route Files Array
    
    UI->>ZIP: Create Archive
    ZIP->>ZIP: Add schema.prisma
    
    loop For Each Route
        ZIP->>ZIP: Add Route File
    end
    
    ZIP->>ZIP: Generate Blob
    ZIP-->>UI: ZIP Blob
    
    UI->>Browser: Trigger Download
    Browser-->>User: foundry-generated.zip
```

## Technology Stack Layers

```mermaid
graph TB
    subgraph "Presentation Layer"
        A[React Components]
        B[Tailwind CSS]
        C[shadcn/ui]
    end
    
    subgraph "Application Layer"
        D[Next.js 14 App Router]
        E[API Routes]
        F[Server Actions]
    end
    
    subgraph "Business Logic Layer"
        G[Generators]
        H[Parsers]
        I[Validators]
    end
    
    subgraph "Integration Layer"
        J[watsonx.ai Client]
        K[Prisma Client]
    end
    
    subgraph "External Services"
        L[watsonx.ai API]
        M[Database]
    end
    
    A --> D
    B --> A
    C --> A
    D --> E
    E --> G
    E --> H
    G --> J
    H --> J
    J --> L
    K --> M
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Vercel Platform"
        A[Next.js App]
        B[API Routes]
        C[Edge Functions]
    end
    
    subgraph "IBM Cloud"
        D[watsonx.ai Service]
    end
    
    subgraph "Database"
        E[PostgreSQL]
        F[Prisma]
    end
    
    subgraph "CDN"
        G[Static Assets]
        H[Images]
    end
    
    I[Users] --> A
    A --> B
    B --> D
    A --> F
    F --> E
    A --> G
    A --> H
```

## Security Layers

```mermaid
flowchart TD
    A[User Request] --> B{File Validation}
    B -->|Invalid| C[Reject]
    B -->|Valid| D{Size Check}
    D -->|Too Large| C
    D -->|OK| E{Type Check}
    E -->|Invalid| C
    E -->|Valid| F[Process Upload]
    
    F --> G{API Key Check}
    G -->|Missing| H[Error]
    G -->|Valid| I[Call watsonx.ai]
    
    I --> J{Rate Limit}
    J -->|Exceeded| K[Wait/Retry]
    J -->|OK| L[Execute Request]
    
    L --> M{Response Validation}
    M -->|Invalid| N[Error Handler]
    M -->|Valid| O[Return Data]
```

## Performance Optimization Points

```mermaid
mindmap
  root((Performance))
    Image Upload
      Client-side compression
      Progressive upload
      Size validation
    AI Processing
      Response caching
      Parallel requests
      Timeout handling
    Code Generation
      Template caching
      Lazy loading
      Worker threads
    File Download
      Streaming
      Compression
      Chunking
    UI Rendering
      Virtual scrolling
      Code splitting
      Memoization
```

## Future Enhancement Roadmap

```mermaid
timeline
    title Foundry Development Roadmap
    section Phase 1
        MVP Launch : Core ERD analysis
                   : Basic schema generation
                   : Simple API routes
    section Phase 2
        Enhanced Features : Multiple DB support
                         : Advanced relationships
                         : Custom templates
    section Phase 3
        Collaboration : User accounts
                      : Shared projects
                      : Version control
    section Phase 4
        AI Improvements : Hand-drawn ERDs
                        : Auto-suggestions
                        : Smart validation
    section Phase 5
        Enterprise : Team features
                   : SSO integration
                   : Advanced analytics
```

## Key Metrics to Monitor

```mermaid
graph LR
    A[Metrics] --> B[Performance]
    A --> C[Usage]
    A --> D[Quality]
    A --> E[Costs]
    
    B --> B1[API Response Time]
    B --> B2[Image Processing Time]
    B --> B3[Generation Speed]
    
    C --> C1[Daily Active Users]
    C --> C2[Images Analyzed]
    C --> C3[Files Generated]
    
    D --> D1[AI Accuracy Rate]
    D --> D2[Error Rate]
    D --> D3[User Satisfaction]
    
    E --> E1[watsonx.ai API Costs]
    E --> E2[Hosting Costs]
    E --> E3[Storage Costs]
```

---

These diagrams provide a comprehensive visual overview of the Foundry application architecture. Use them as reference during development and for team communication.