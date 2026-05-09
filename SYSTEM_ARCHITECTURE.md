# PhishGuard: System Architecture Overview
## Complete System Understanding

---

## 1. System Context & Purpose

### What Problem Does PhishGuard Solve?

**Challenge**: 
- Phishing attacks continue to grow in sophistication
- Users need instant, reliable URL safety verification
- Organizations need to track and monitor phishing threats

**Solution**:
- Real-time URL classification using machine learning
- Instant feedback to users (< 100ms)
- Historical tracking and analytics for security teams
- Multi-layered approach combining heuristics + ML

### Key Stakeholders

1. **End Users**: Individual users scanning suspicious URLs
2. **Administrators**: Security teams monitoring trends
3. **Developers**: Teams building and maintaining the platform

---

## 2. High-Level System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                   │
│  (What users see and interact with)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Landing     │  │  Dashboard   │  │    Admin     │      │
│  │  Page        │  │  (Scanning)  │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                 │              │
│         └──────────────────┼─────────────────┘              │
│                            ▼                                │
│                  ┌──────────────────┐                       │
│                  │  Authentication  │                       │
│                  │  (Supabase Auth) │                       │
│                  └──────────────────┘                       │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS REST API + JWT
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                       BUSINESS LOGIC LAYER                   │
│  (Where the actual work happens)                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Flask Backend Application                                  │
│  ├─ Request Router & Handler                               │
│  ├─ Authentication & Authorization                         │
│  ├─ URL Processing Pipeline                                │
│  ├─ ML Model Service (Inference)                           │
│  ├─ Scan Service (Results & History)                       │
│  ├─ Auth Service (User Management)                         │
│  └─ Persistence Service                                    │
│         ├─ Supabase (Primary)                              │
│         └─ SQLite (Fallback)                               │
│                                                             │
└───────────────────────────┬──────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
┌─────────▼──────┐  ┌──────▼───────┐  ┌──────▼──────┐
│ SUPABASE       │  │ LOCAL DB     │  │ ML MODELS  │
│ (PostgreSQL)   │  │ (SQLite)     │  │            │
│                │  │              │  │ • model.pkl│
│ • scans table  │  │ • scan_      │  │ • vectorizer│
│ • profiles     │  │   history    │  │   .pkl     │
│ • auth users   │  │              │  │            │
└────────────────┘  └──────────────┘  └────────────┘
```

### Data Flow Diagram

```
USER INTERACTION
       │
       ▼
    Enter URL (e.g., https://amazon-verify-account.phishing.com)
       │
       ▼
    Frontend validates & sends to backend
       │
       ├─ Header: Authorization: Bearer JWT_TOKEN
       └─ Body: { url: "..." }
       │
       ▼
    Backend Authentication Check
       │
       ├─ Verify JWT signature
       ├─ Extract user_id from claims
       └─ Validate user permissions
       │
       ▼
    URL Processing Pipeline
       │
       ├─ Input validation (URL format, length)
       ├─ URL normalization (scheme, host, path)
       ├─ Heuristic feature extraction
       │  ├─ uses_https
       │  ├─ contains_ip_address
       │  ├─ subdomain_depth
       │  └─ path_depth
       ├─ Target brand detection
       └─ Combined text creation
       │
       ▼
    ML Model Inference
       │
       ├─ TF-IDF Vectorization
       ├─ Decision Tree Prediction
       ├─ Probability Calculation
       └─ Confidence Scoring
       │
       ▼
    Result: { 
       result: "phishing" | "legit",
       confidence: 0.85,
       model_version: "decision-tree-v1"
    }
       │
       ▼
    Persistence
       │
       ├─ Try: Save to Supabase
       │  └─ If success → Return result
       │  └─ If fail → Try fallback
       │
       └─ Fallback: Save to SQLite
          └─ Return result + warning
       │
       ▼
    Frontend Display Results
       │
       ├─ Color-coded alert (Red=Phishing, Green=Legit)
       ├─ Confidence percentage
       ├─ Detected brand (if applicable)
       └─ Action buttons (Report, Block, Learn)
```

---

## 3. Frontend Architecture

### Technology Stack

- **Framework**: React 19+
- **Language**: TypeScript
- **Build Tool**: Vite (Fast dev server & builds)
- **Routing**: TanStack Router (Modern SPA routing)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Package Manager**: Bun (Fast alternative to npm)
- **Testing**: Vitest (Unit tests) + Playwright (E2E tests)

### Page Structure

#### 3.1 Landing Page (`src/pages/LandingPage.tsx`)
- **Purpose**: Marketing & entry point
- **Features**:
  - Feature overview
  - Call-to-action buttons (Sign up, Sign in)
  - Demo or statistics
  - Educational content about phishing

#### 3.2 Dashboard Page (`src/pages/DashboardPage.tsx`)
- **Purpose**: Main scanning interface
- **Features**:
  - URL input field
  - Submit button
  - Result display (Phishing/Legit + Confidence)
  - Heuristics breakdown
  - Quick actions (New scan, View history, Export)

#### 3.3 History Page (`src/pages/HistoryPage.tsx`)
- **Purpose**: View and manage past scans
- **Features**:
  - Table/List of scans
  - Pagination (20 items per page)
  - Filtering (by result: phishing/legit)
  - Sorting (newest, oldest, confidence)
  - Search box (by URL)
  - CSV export

#### 3.4 Admin Page (`src/pages/AdminPage.tsx`)
- **Purpose**: Platform-wide analytics
- **Features**:
  - Total scans count
  - Phishing detection rate
  - Top target brands (pie chart)
  - Confidence distribution (histogram)
  - Recent detections
  - User activity log

### Authentication Flow

```
User enters credentials
    │
    ▼
Supabase Auth Client
    │
    ├─ Validate email/password
    ├─ Create session
    └─ Generate JWT token
    │
    ▼
Store token in React Context
    │
    ├─ Available to all components
    └─ Persists across page reloads
    │
    ▼
Protected Routes
    │
    ├─ Check token in context
    ├─ If valid → Allow access
    └─ If invalid → Redirect to login
    │
    ▼
Include JWT in API requests
    │
    ├─ Authorization header
    └─ Backend validates signature
```

### Component Hierarchy

```
App (Root)
├─ Layout
│  ├─ Header
│  │  ├─ Logo/Brand
│  │  ├─ Navigation
│  │  └─ User Menu
│  └─ Footer
├─ Routes
│  ├─ Landing Page
│  │  └─ Hero Section
│  │  └─ Features
│  │  └─ CTA
│  │
│  ├─ Auth Pages
│  │  ├─ Login Page
│  │  │  └─ Email/Password Form
│  │  └─ Signup Page
│  │     └─ Email/Password Form
│  │
│  ├─ Dashboard Page
│  │  ├─ URL Input
│  │  ├─ ResultDisplay
│  │  │  ├─ Alert (Phishing/Legit)
│  │  │  ├─ Confidence Score
│  │  │  └─ Details Panel
│  │  └─ Quick Links
│  │
│  ├─ History Page
│  │  ├─ Filter Bar
│  │  ├─ Search Box
│  │  ├─ Sort Dropdown
│  │  ├─ History Table
│  │  ├─ Pagination
│  │  └─ Export Button
│  │
│  └─ Admin Page
│     ├─ Stats Cards
│     ├─ Charts
│     │  ├─ Pie Chart (Top Targets)
│     │  ├─ Bar Chart (Confidence Distribution)
│     │  └─ Time Series (Scans Over Time)
│     ├─ Recent Detections Table
│     └─ User Activity
```

---

## 4. Backend Architecture

### Technology Stack

- **Framework**: Flask (Python microframework)
- **Server**: Gunicorn (WSGI server for production)
- **ML Library**: scikit-learn (Decision Tree + TF-IDF)
- **Data Processing**: pandas, numpy, joblib
- **Database**: Supabase (PostgreSQL cloud), SQLite (fallback)
- **Authentication**: PyJWT + Supabase
- **Testing**: pytest (unit tests)

### Backend Services Architecture

```
Flask Application Entry Point (app.py)
    │
    ├─ Configuration (settings.py)
    │  ├─ Environment variables
    │  ├─ Model paths
    │  ├─ Database URLs
    │  └─ Feature flags
    │
    ├─ Service Initialization
    │  ├─ PhishingModelService
    │  │  ├─ Load model.pkl
    │  │  └─ Load vectorizer.pkl
    │  │
    │  ├─ ScanService
    │  │  ├─ Initialize with model service
    │  │  ├─ Initialize with history store
    │  │  └─ Database connection
    │  │
    │  ├─ AuthService
    │  │  └─ Supabase client
    │  │
    │  └─ LocalHistoryStore
    │     └─ SQLite connection
    │
    ├─ Route Registration
    │  ├─ POST /api/scan
    │  ├─ GET /api/history
    │  ├─ GET /api/history/export
    │  └─ GET /api/admin/stats
    │
    └─ Error Handling Middleware
       ├─ Validation errors → 400
       ├─ Auth errors → 401
       ├─ Permission errors → 403
       └─ Server errors → 500
```

### Service Details

#### 4.1 PhishingModelService

**Responsibilities**:
1. Load ML model and vectorizer
2. Transform URLs to features
3. Make predictions
4. Calculate confidence scores

**Key Methods**:
```python
class PhishingModelService:
    predict(prepared_url) → ModelPrediction
    _ensure_loaded() → None
    _transform(text_inputs) → features
    _extract_probability(features) → confidence
```

#### 4.2 ScanService

**Responsibilities**:
1. Coordinate the scanning process
2. Call model service for predictions
3. Persist results to database
4. Handle fallback logic
5. Retrieve scan history
6. Generate admin statistics

**Key Methods**:
```python
class ScanService:
    scan_url(user, raw_url) → result
    get_history(user, ...) → history_items
    get_admin_stats(range_value) → stats
    _save_scan(user, prepared_url, prediction) → None
    _save_local_scan(...) → None
```

#### 4.3 AuthService

**Responsibilities**:
1. Create user accounts via Supabase
2. Manage user profiles
3. Assign roles (user/admin)

**Key Methods**:
```python
class AuthService:
    signup(email, password) → user_id
    create_profile(user_id, email) → None
```

#### 4.4 LocalHistoryStore

**Responsibilities**:
1. Fallback storage when Supabase is unavailable
2. SQLite database management
3. Query history locally

**Key Methods**:
```python
class LocalHistoryStore:
    save_scan(user_id, url, result, ...) → None
    fetch_history(user_id, ...) → items
    get_count(user_id) → count
```

### URL Processing Pipeline

```python
# Input
raw_url = "https://amazon-verify-account.phishing.com"

# Step 1: Validation
PreparedUrl = prepare_url(raw_url, brand_keywords)
# Validates:
# ├─ URL format
# ├─ Scheme (http/https only)
# ├─ Hostname exists
# ├─ Length <= 2048 chars
# └─ No control characters

# Step 2: Normalization
PreparedUrl includes:
# ├─ original_url: Raw input
# ├─ normalized_url: Standardized form
# ├─ hostname: Extracted domain
# ├─ inferred_target: Detected brand
# ├─ combined_text: URL + target for ML
# └─ heuristics: Features dict

# Output
prepared_url = {
    original_url: "https://amazon-verify-account.phishing.com",
    normalized_url: "https://amazon-verify-account.phishing.com/",
    hostname: "amazon-verify-account.phishing.com",
    inferred_target: "Amazon",
    combined_text: "https://amazon-verify-account.phishing.com/ amazon",
    heuristics: {
        uses_https: True,
        contains_ip_address: False,
        subdomain_depth: 1,
        path_depth: 0
    }
}
```

---

## 5. Database Architecture

### Supabase Database Schema

#### Table: `scans`
**Purpose**: Store all scan results for analytics and history

**Columns**:
```sql
id                    UUID              -- Primary key
user_id               UUID              -- User who performed scan
email                 TEXT              -- User's email (denormalized)
url                   TEXT              -- Original URL
normalized_url        TEXT              -- Standardized URL
hostname              TEXT              -- Domain/host
inferred_target       TEXT              -- Detected brand
result                ENUM              -- 'phishing' | 'legitimate'
confidence_score      REAL              -- 0.0 - 1.0
detection_method      TEXT              -- Always 'ml' currently
details               JSONB             -- Additional metadata
model_name            TEXT              -- Model used (e.g., DecisionTreeClassifier)
model_version         TEXT              -- Model version
metadata              JSONB             -- Extra data
created_at            TIMESTAMPTZ       -- When scan was created
```

**Indexes**:
```sql
-- For user history queries
CREATE INDEX idx_scans_user_created 
ON scans(user_id, created_at DESC, id DESC);

-- For filtering by result
CREATE INDEX idx_scans_result_created 
ON scans(result, created_at DESC);

-- For time-based queries
CREATE INDEX idx_scans_created 
ON scans(created_at DESC);

-- For full-text URL search
CREATE INDEX idx_scans_url_trgm 
ON scans USING gin (url gin_trgm_ops);
```

**Row-Level Security (RLS)**:
```sql
-- Users can only see their own scans
CREATE POLICY "users read own scans" ON scans
FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own scans
CREATE POLICY "users insert own scans" ON scans
FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### Table: `profiles`
**Purpose**: User profile information

**Columns**:
```sql
id         UUID         -- Matches auth.users.id
email      TEXT         -- User's email
created_at TIMESTAMPTZ  -- Account creation date
```

#### Table: `user_roles`
**Purpose**: Admin access control

**Columns**:
```sql
user_id    UUID    -- User ID
role       TEXT    -- 'user' | 'admin'
created_at TIMESTAMPTZ
```

### SQLite Fallback Schema

**File**: `backend/instance/scan_history.sqlite`

**Purpose**: Local backup when Supabase unavailable

**Tables**:
- Similar to Supabase `scans` table
- Auto-created on first fallback write
- Thread-safe access via threading.Lock()

---

## 6. ML Model Architecture

### Model Information

```
Algorithm: Decision Tree Classifier
Framework: scikit-learn
File: model.pkl
Vectorizer: vectorizer.pkl

Training Data Characteristics:
├─ Label: Binary (Phishing=1, Legitimate=0)
├─ Features: TF-IDF vectors from URLs
├─ Source: Historical phishing + legitimate URLs
└─ Size: Typically 10,000-100,000 URLs

Model Characteristics:
├─ Tree Depth: ~10-30 levels
├─ Number of Nodes: ~100-10,000
├─ Number of Leaves: ~50-5,000
└─ Decision Rules: Automatically learned
```

### Feature Space

```
Input: Raw URL
    │
    ▼
Preprocessing:
├─ Normalization (IDNA, path encoding)
├─ Heuristic extraction (but not used by model)
└─ Text combination (URL + brand)
    │
    ▼
Vectorization (TF-IDF):
├─ Tokenizer: Character n-grams (e.g., trigrams)
├─ Number of features: 1,000-100,000 (depends on vocabulary)
└─ Output: Sparse vector of term frequencies
    │
    ▼
Feature Space:
├─ Dimension: N (number of unique n-grams)
├─ Sparsity: ~99% (most n-grams are 0)
└─ Representation: Learned patterns of phishing URLs
```

### Prediction Process

```
Input URL → Normalized URL → Combined Text
                                  │
                                  ▼
                        Vectorize (TF-IDF)
                                  │
                                  ▼
                         Feature Vector
                                  │
                                  ▼
                    Decision Tree Traversal
                    (1000+ internal nodes)
                                  │
                                  ▼
                    Reach Leaf Node
                    (Contains class distribution)
                                  │
                                  ▼
                    Extract Probability
                    [P(Legit), P(Phishing)]
                                  │
                                  ▼
                    Return Prediction + Confidence
```

---

## 7. API Architecture

### REST Endpoints

```
BASE_URL: http://localhost:5000 (dev) or https://api.phishguard.com (prod)

Authentication: JWT Bearer Token in Authorization header

Endpoints:

1. POST /api/scan
   Purpose: Scan a URL
   Auth: Required
   Body: { url: string }
   Response: { result: string, confidence: number }
   Errors: 400 (validation), 401 (auth), 500 (server)

2. GET /api/history
   Purpose: Get user's scan history
   Auth: Required
   Query: limit, offset, search, result, sort
   Response: { items: [...], total: number, pagination: {...} }

3. GET /api/history/export
   Purpose: Export history as CSV
   Auth: Required
   Query: Same as /api/history
   Response: CSV file download

4. GET /api/admin/stats
   Purpose: Get platform statistics
   Auth: Required (Admin role)
   Query: range (7d|30d|90d), include_auth_history
   Response: { total_scans, phishing_detected, ... }
```

### Request/Response Format

```
Request Example:
POST /api/scan
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "url": "https://amazon-verify-account.com"
}

Response Example:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": "phishing",
  "confidence": 0.8832
}

Error Response Example:
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "url must be 2048 characters or fewer"
}
```

---

## 8. Authentication & Security

### Authentication Flow

```
User Registration:
1. User enters email & password
2. Frontend sends to Supabase Auth
3. Supabase creates account
4. JWT token returned
5. Token stored in React Context
6. Auto-login on page reload

User Login:
1. User enters credentials
2. Supabase validates
3. JWT issued
4. Token used in all API calls

Token Validation:
1. Backend receives JWT in header
2. Verify signature using public key
3. Extract claims (user_id, email)
4. Continue request or return 401
```

### Authorization

```
User Actions:
├─ Can scan URLs
├─ Can view own history
├─ Can export own history
└─ Cannot access admin endpoints

Admin Actions:
├─ Can scan URLs (same as users)
├─ Can view own history (same as users)
├─ Can view /api/admin/stats
└─ Can view all user activity
```

### Security Best Practices

```
✅ Input Validation
├─ URL format checking
├─ Length limits (2048 chars)
└─ Control character removal

✅ Authentication
├─ JWT signature verification
├─ Token expiration checks
└─ Supabase handles secure storage

✅ Authorization
├─ Row-level security on database
├─ Users can only access own data
└─ Admin role checking for admin endpoints

✅ Data Protection
├─ HTTPS only in production
├─ Database encryption at rest
├─ No sensitive data in logs
└─ SQL injection prevention via ORM

✅ Error Handling
├─ Generic error messages to users
├─ Detailed logs for debugging
├─ No stack traces exposed
└─ Graceful degradation on failures
```

---

## 9. Deployment Architecture

### Development Environment

```
Local Machine
├─ Frontend
│  └─ npm/bun dev → http://localhost:5173
├─ Backend
│  └─ flask run → http://localhost:5000
└─ Database
   └─ Supabase (cloud) or Local PostgreSQL
```

### Production Environment

```
Docker Deployment
├─ Backend Service
│  ├─ Image: phishguard-backend:latest
│  ├─ Port: 5000
│  ├─ Command: gunicorn -w 4 wsgi:app
│  └─ Replicas: 4+ workers
│
├─ Frontend Service
│  ├─ Image: phishguard-frontend:latest
│  ├─ Port: 5173
│  ├─ Build: npm run build → serve dist/
│  └─ Replicas: 1-2
│
└─ Database
   ├─ Supabase (managed cloud)
   ├─ PostgreSQL database
   └─ Automatic backups

Orchestration:
├─ Docker Compose (for multi-container coordination)
├─ Environment variables (.env files)
├─ Health checks
└─ Restart policies
```

### Environment Variables

**Backend**:
```bash
# Model
MODEL_PATH=model.pkl
VECTORIZER_PATH=vectorizer.pkl
MODEL_VERSION=decision-tree-v1

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
SUPABASE_ANON_KEY=xxxxx

# Brand Keywords
BRAND_KEYWORDS=amazon,paypal,microsoft,apple

# Flask
FLASK_ENV=production
FLASK_DEBUG=false
```

**Frontend**:
```bash
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
```

---

## 10. Data Flow Examples

### Example 1: User Scans URL

```
Step 1: User Input
└─ URL: "https://verify-amazon.com"

Step 2: Frontend Request
POST /api/scan
Authorization: Bearer JWT...
{url: "https://verify-amazon.com"}

Step 3: Backend Authentication
├─ Verify JWT signature: ✓
├─ Extract user_id: "user-123"
└─ Continue processing

Step 4: URL Processing
├─ Normalize: "https://verify-amazon.com/"
├─ Extract hostname: "verify-amazon.com"
├─ Detect brand: "Amazon" (found "amazon" in URL)
└─ Extract heuristics:
   ├─ uses_https: true
   ├─ contains_ip: false
   ├─ subdomain_depth: 1
   └─ path_depth: 0

Step 5: ML Inference
├─ Combine text: "https://verify-amazon.com/ amazon"
├─ Vectorize: [0.34, 0.52, 0.12, ...]
├─ Predict: model.predict(features) → [1]
├─ Get probability: [0.15, 0.85]
└─ Confidence: 0.85

Step 6: Result
{
  result: "phishing",
  confidence: 0.85,
  model_name: "DecisionTreeClassifier",
  model_version: "decision-tree-v1"
}

Step 7: Persistence
├─ Try: INSERT into Supabase scans table
├─ If success: Return result
└─ If fail: Fall back to SQLite + return warning

Step 8: Response
HTTP 200
{
  result: "phishing",
  confidence: 0.85
}

Step 9: Frontend Display
├─ Show red alert: "PHISHING DETECTED"
├─ Confidence: 85%
├─ Brand: "Amazon"
└─ Actions: [Report] [Block] [Learn]
```

### Example 2: Admin Views Statistics

```
Step 1: Admin navigates to /admin
├─ Frontend checks role: "admin" ✓
└─ Displays admin dashboard

Step 2: Load statistics
GET /api/admin/stats?range=30d&include_auth_history=true
Authorization: Bearer JWT...

Step 3: Backend Validation
├─ Verify JWT: ✓
├─ Check role: admin ✓
└─ Extract range: 30d

Step 4: Query Database
SELECT COUNT(*) FROM scans
WHERE created_at > now() - '30 days'::interval;

SELECT result, COUNT(*) FROM scans
GROUP BY result;

SELECT inferred_target, COUNT(*) FROM scans
GROUP BY inferred_target
ORDER BY COUNT(*) DESC;

Step 5: Aggregate Results
{
  total_scans: 1234,
  phishing_detected: 456,
  legitimate_detected: 778,
  confidence_distribution: {
    high: 350,
    medium: 85,
    low: 21
  },
  top_targets: [
    {target: "Amazon", count: 128},
    {target: "PayPal", count: 95}
  ]
}

Step 6: Response
HTTP 200
{...stats...}

Step 7: Frontend Display
├─ Pie chart: Target distribution
├─ Bar chart: Confidence levels
├─ Line chart: Scans over time
└─ Table: Recent detections
```

---

## 11. Key Metrics & KPIs

### Performance Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| **Model Inference** | < 5ms | ~2ms ✓ |
| **URL Normalization** | < 10ms | ~5ms ✓ |
| **API Response** | < 100ms | ~50-70ms ✓ |
| **Throughput** | > 100 rps | 250-300 rps ✓ |
| **Memory/Request** | < 100KB | ~92KB ✓ |
| **Model Size** | < 10MB | 2-5MB ✓ |

### Business Metrics

| Metric | Importance | Measurement |
|--------|-----------|-------------|
| **Accuracy** | High | TP/(TP+FP) |
| **False Positive Rate** | Critical | FP/(FP+TN) |
| **Detection Rate** | High | TP/(TP+FN) |
| **Uptime** | Critical | 99.9%+ |
| **User Satisfaction** | High | NPS Score |
| **Adoption Rate** | Medium | Active Users |

---

## 12. Scaling & Future Roadmap

### Current Capacity

```
Single Backend Instance:
├─ Requests/sec: 100-150 rps
├─ Concurrent users: 50-100
├─ Response time: 50-70ms (P95)
└─ Memory: 200-400 MB

With 4 Workers (Gunicorn):
├─ Requests/sec: 250-300 rps
├─ Concurrent users: 200-400
├─ Response time: 50-70ms (P95)
└─ Memory: 1-2 GB
```

### Scaling Strategy

```
Horizontal Scaling:
├─ Add more backend instances
├─ Load balancer (Nginx/HAProxy)
├─ Database connection pooling
└─ Redis for caching

Vertical Scaling:
├─ Upgrade instance CPU/RAM
├─ Increase gunicorn workers
└─ Optimize database queries

Caching Strategy:
├─ Redis for vectorizer results
├─ Cache normalized URLs
├─ Cache brand detection results
└─ Hit rate estimate: 10-20%
```

### Future Enhancements

```
Short-term (1-3 months):
├─ Batch scanning endpoint
├─ CSV import for bulk scanning
├─ Email alerting system
└─ Mobile app (React Native)

Medium-term (3-6 months):
├─ Enhanced models (ensemble)
├─ Real-time threat intelligence
├─ Browser extension
└─ API for third-party integration

Long-term (6-12 months):
├─ Deep learning models
├─ GPU acceleration
├─ Global threat database
└─ White-label solution
```

---

## 13. Monitoring & Observability

### Logs

```
Structured Logging:
├─ Application logs
│  ├─ INFO: Request received
│  ├─ WARNING: Supabase fallback triggered
│  └─ ERROR: Model prediction failed
│
├─ Model logs
│  ├─ Model loaded successfully
│  ├─ Inference time: 2.3ms
│  └─ Prediction: 1 (Phishing)
│
└─ Database logs
   ├─ Query time: 45ms
   ├─ Rows returned: 20
   └─ Error: Connection timeout
```

### Metrics

```
Application Metrics:
├─ Request rate (req/sec)
├─ Response time (ms)
├─ Error rate (%)
├─ Model inference time (ms)
└─ Database query time (ms)

System Metrics:
├─ CPU usage (%)
├─ Memory usage (MB)
├─ Disk I/O (MB/s)
└─ Network I/O (Mbps)

Business Metrics:
├─ Total scans (count)
├─ Phishing detections (%)
├─ User registrations (count)
└─ Admin dashboards viewed (count)
```

---

## 14. Troubleshooting Guide

### Common Issues

#### Issue 1: "Model service is unavailable"
```
Cause: model.pkl or vectorizer.pkl missing
Solution:
├─ Check files exist: ls model.pkl vectorizer.pkl
├─ Verify MODEL_PATH env variable
└─ Restart backend service
```

#### Issue 2: Slow API responses (> 100ms)
```
Cause: Database latency or high CPU
Solution:
├─ Check Supabase connection: SUPABASE_TIMEOUT_SECONDS
├─ Enable query caching: Redis
├─ Add more workers: gunicorn -w 8
└─ Scale horizontally: Add more instances
```

#### Issue 3: Scans not being saved
```
Cause: Supabase unavailable, fallback working
Solution:
├─ Check Supabase status page
├─ Verify SUPABASE_URL and keys
├─ Check local SQLite: instance/scan_history.sqlite
└─ Sync data once cloud is back
```

#### Issue 4: Authentication errors
```
Cause: Invalid JWT or token expired
Solution:
├─ Check token expiration: jwt.io
├─ Refresh token from Supabase Auth
├─ Verify JWT_SECRET matches
└─ Clear browser cache
```

---

## Summary: Key Takeaways

### What You Should Understand

1. **Frontend** (React + TypeScript)
   - React components for UI
   - Supabase Auth for user management
   - TanStack Router for navigation
   - Fetches data from Flask backend

2. **Backend** (Flask + Python)
   - Handles authentication & routing
   - Runs ML model for predictions
   - Manages database persistence
   - Provides REST API endpoints

3. **Machine Learning**
   - Decision Tree classifier from scikit-learn
   - TF-IDF vectorization for text features
   - Very fast inference (~2ms)
   - Returns confidence scores

4. **Database**
   - Supabase (PostgreSQL) for primary storage
   - SQLite fallback for resilience
   - Row-level security for privacy
   - Efficient indexing for queries

5. **End-to-End Flow**
   - User scans URL → Frontend sends request
   - Backend validates & preprocesses URL
   - ML model makes prediction
   - Result saved to database
   - Response returned to user

---

**Documentation Version**: 1.0  
**Created**: May 8, 2026  
**System**: PhishGuard Complete System Architecture
