# HeySalad Laura - Quality Control Module Design

## Overview

A centralized quality control system in Laura dashboard that:
- Controls multiple cameras (ESP32-S3 + RE:Camera)
- Implements quality checklists for food prep
- Links photos to orders/batches
- Tracks quality metrics and trends
- Generates audit reports for compliance

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAURA DASHBOARD                              │
│                  /quality-control                               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Station    │  │  Checklist   │  │   Reports    │        │
│  │    View      │  │   & Photos   │  │  & Metrics   │        │
│  │              │  │              │  │              │        │
│  │ [Camera 1]   │  │ ☐ Contents   │  │ Pass Rate    │        │
│  │ [Camera 2]   │  │ ☐ Sealing    │  │ Avg Time     │        │
│  │ [Camera 3]   │  │ ☐ Label      │  │ Issues Log   │        │
│  │              │  │ [📸 Verify]  │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                         ↓ Commands via WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                      CAMERAS                                    │
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│  │ ESP32-S3    │   │ ESP32-S3    │   │ RE:Camera   │          │
│  │ Station 1   │   │ Station 2   │   │ Station 3   │          │
│  │             │   │             │   │             │          │
│  │ Prep Area   │   │ Packing     │   │ Final QC    │          │
│  └─────────────┘   └─────────────┘   └─────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### quality_stations Table
```sql
create table quality_stations (
  id uuid primary key default uuid_generate_v4(),
  station_name text not null,              -- "Prep Station 1"
  station_type text not null,              -- "prep", "packing", "final_qc"
  camera_id uuid references cameras(id),   -- Link to camera
  active boolean default true,
  checklist_template_id uuid,
  location text,                           -- "Kitchen North"
  created_at timestamptz default now()
);
```

### quality_checks Table
```sql
create table quality_checks (
  id uuid primary key default uuid_generate_v4(),
  station_id uuid references quality_stations(id),
  order_id uuid,                           -- Link to order
  batch_id text,                           -- For bulk production
  inspector_name text,                     -- Who performed check
  status text check (status in ('pending', 'in_progress', 'passed', 'failed')),

  -- Checklist items (JSONB for flexibility)
  checklist jsonb,
  /* Example:
  {
    "contents_correct": true,
    "sealing_intact": true,
    "label_accurate": true,
    "temperature_ok": true,
    "notes": "Extra napkins added"
  }
  */

  -- Photos
  photo_ids uuid[],                        -- Array of camera_photo IDs

  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  duration_seconds integer,

  -- Metadata
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
```

### quality_templates Table
```sql
create table quality_templates (
  id uuid primary key default uuid_generate_v4(),
  template_name text not null,             -- "Standard Salad Bowl"
  station_type text not null,
  checklist_items jsonb not null,
  /* Example:
  [
    {
      "id": "contents",
      "label": "All items present",
      "type": "boolean",
      "required": true,
      "photo_required": true
    },
    {
      "id": "weight",
      "label": "Weight (grams)",
      "type": "number",
      "min": 450,
      "max": 550,
      "photo_required": false
    },
    {
      "id": "temperature",
      "label": "Temperature (°C)",
      "type": "number",
      "max": 5,
      "photo_required": true
    }
  ]
  */
  active boolean default true,
  created_at timestamptz default now()
);
```

### quality_metrics Table (Aggregated stats)
```sql
create table quality_metrics (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  station_id uuid references quality_stations(id),

  -- Metrics
  total_checks integer default 0,
  passed_checks integer default 0,
  failed_checks integer default 0,
  avg_duration_seconds integer,

  -- Issues breakdown
  issues_breakdown jsonb,
  /* Example:
  {
    "sealing": 3,
    "contents": 1,
    "temperature": 2
  }
  */

  created_at timestamptz default now(),
  unique(date, station_id)
);
```

---

## UI Components

### 1. Station Selector (`/quality-control`)

```typescript
// src/app/(routes)/quality-control/page.tsx

interface QualityStation {
  id: string;
  name: string;
  camera: Camera;
  status: 'active' | 'idle';
  currentCheck?: QualityCheck;
}

// Layout:
// +---------------------------+
// | Quality Control Dashboard |
// +---------------------------+
// | [Station 1] [Station 2]   |
// | [Station 3] [+ Add]       |
// +---------------------------+
// | Active Checks: 2          |
// | Today's Pass Rate: 95%    |
// +---------------------------+
```

### 2. Quality Check Interface

```typescript
// src/components/quality/CheckInterface.tsx

interface CheckInterfaceProps {
  station: QualityStation;
  template: QualityTemplate;
  orderId?: string;
}

// Layout:
// +--------------------------------+
// | Order #1234 - Quinoa Bowl      |
// +--------------------------------+
// | Camera Feed: [Live Preview]    |
// |                                |
// | Checklist:                     |
// | ☐ All items present  [📸 Take] |
// | ☐ Lid sealed         [📸 Take] |
// | ☐ Label correct      [📸 Take] |
// | ☐ Temp < 5°C         [📸 Take] |
// |                                |
// | Photos (3):                    |
// | [thumb] [thumb] [thumb]        |
// |                                |
// | Notes: _____________________   |
// |                                |
// | [❌ Fail]  [✅ Pass & Complete]|
// +--------------------------------+
```

### 3. Camera Control Panel

```typescript
// src/components/quality/CameraPanel.tsx

interface CameraPanelProps {
  camera: Camera;
  onCapture: (checkItemId: string) => void;
}

// Layout:
// +--------------------------------+
// | Camera: Packing Station 1      |
// +--------------------------------+
// | [Live Preview or Last Photo]   |
// |                                |
// | Status: 🟢 Online              |
// | Battery: 85%                   |
// | Last Photo: 2 mins ago         |
// |                                |
// | [📸 Take Photo]                |
// | [🔄 Refresh Preview]           |
// | [⚙️ Settings]                  |
// +--------------------------------+
```

### 4. Quality Reports

```typescript
// src/components/quality/Reports.tsx

// Layout:
// +--------------------------------+
// | Quality Reports                |
// +--------------------------------+
// | Date Range: [Oct 1 - Oct 29]  |
// |                                |
// | Overall Pass Rate: 94%         |
// | Total Checks: 487              |
// | Failed: 29                     |
// |                                |
// | Issues Breakdown:              |
// |   Sealing: 12 (41%)            |
// |   Contents: 8 (28%)            |
// |   Temperature: 5 (17%)         |
// |   Other: 4 (14%)               |
// |                                |
// | By Station:                    |
// |   Station 1: 96% (120 checks)  |
// |   Station 2: 93% (180 checks)  |
// |   Station 3: 94% (187 checks)  |
// |                                |
// | [📊 Export CSV] [📄 Print]    |
// +--------------------------------+
```

---

## Workflow Examples

### Workflow 1: Standard Quality Check

```
1. Worker starts shift at Packing Station
     ↓
2. Opens Laura → Quality Control → "Packing Station 1"
     ↓
3. Scans order QR code or enters order number
     ↓
4. Laura loads checklist template for "Quinoa Bowl"
     ↓
5. Worker places bowl under camera
     ↓
6. Worker checks each item:
     ☐ All ingredients present
       → Clicks [📸 Take Photo]
       → Laura sends command to ESP32
       → Photo captured and uploaded
       → Checkbox auto-checked ✅

     ☐ Lid sealed properly
       → Clicks [📸 Take Photo]
       → Photo captured
       → Checkbox auto-checked ✅

     ☐ Label matches order
       → Visual check
       → Manually checks ✅
       → Optionally add photo

     ☐ Temperature < 5°C
       → Checks thermometer strip in photo
       → Clicks [📸 Take Photo]
       → AI could auto-verify temperature strip color
       → Checkbox auto-checked ✅
     ↓
7. All items checked → Click [✅ Pass & Complete]
     ↓
8. Laura:
     - Marks quality check as "passed"
     - Links all photos to order
     - Updates order status to "QC Passed"
     - Timestamps completion
     - Adds to quality metrics
     ↓
9. Next order automatically loads
```

### Workflow 2: Failed Quality Check

```
1. During check, worker notices missing ingredient
     ↓
2. Takes photo of incomplete bowl
     ↓
3. Adds note: "Quinoa missing, need to remake"
     ↓
4. Clicks [❌ Fail]
     ↓
5. Laura:
     - Marks check as "failed"
     - Creates alert for manager
     - Flags order for remake
     - Records issue type: "contents_incorrect"
     - Adds to daily metrics
     ↓
6. Manager gets notification in Laura
     ↓
7. Manager reviews photos and note
     ↓
8. Order sent back to kitchen for remake
```

### Workflow 3: Batch Production Check

```
1. Kitchen prepares 50 quinoa bowls
     ↓
2. QC inspector at Final QC station
     ↓
3. Opens Laura → "Batch Check Mode"
     ↓
4. Creates batch: "Quinoa Bowls - Batch 23"
     ↓
5. Random sampling: Check 5 bowls from batch
     ↓
6. For each sampled bowl:
     - Full checklist
     - Photos from all angles
     - Temperature check
     ↓
7. If all 5 pass → Entire batch passes
     ↓
8. If 1 fails → Inspect 10 more
     ↓
9. If 2+ fail → Reject entire batch
     ↓
10. Laura generates batch report with all photos
```

---

## RE:Camera Integration

### What is RE:Camera?
RE:Camera appears to be an AI-powered camera device. Integration considerations:

### Differences from ESP32-S3:

| Feature | ESP32-S3 | RE:Camera |
|---------|----------|-----------|
| Control | WebSocket | ? (HTTP/MQTT/API?) |
| AI Features | None (basic) | Built-in AI vision |
| Resolution | Up to 2MP | Higher? |
| Power | Battery/USB | ? |
| Cost | ~$15 | Higher |

### Integration Strategy:

```typescript
// Abstract camera interface
interface CameraDevice {
  type: 'esp32-s3' | 'recamera';
  capturePhoto(): Promise<string>;
  getStatus(): Promise<CameraStatus>;
  reboot(): Promise<void>;
}

// ESP32 implementation (already done)
class ESP32Camera implements CameraDevice {
  type = 'esp32-s3';

  async capturePhoto() {
    // Send WebSocket command
    // Return photo URL
  }
}

// RE:Camera implementation
class RECamera implements CameraDevice {
  type = 'recamera';

  async capturePhoto() {
    // Call RE:Camera API
    // Return photo URL
  }

  // Additional AI features
  async analyzeQuality(photo: string): Promise<QualityScore> {
    // Use RE:Camera's AI to auto-verify quality
    return {
      contents_present: true,
      freshness_score: 95,
      temperature_ok: true,
      confidence: 0.92
    };
  }
}
```

### RE:Camera Advantages for QC:

1. **Auto-verification**: AI detects missing ingredients
2. **Freshness scoring**: Analyzes produce quality
3. **Text recognition**: Reads expiration dates, labels
4. **Color analysis**: Verifies temperature strips
5. **Defect detection**: Spots packaging issues

### Unified QC Interface:

```typescript
// src/components/quality/UnifiedCameraControl.tsx

function CameraControl({ camera }: { camera: CameraDevice }) {
  const handleCapture = async (checkItem: string) => {
    // 1. Capture photo (works for both camera types)
    const photoUrl = await camera.capturePhoto();

    // 2. If RE:Camera, get AI analysis
    if (camera.type === 'recamera') {
      const analysis = await (camera as RECamera).analyzeQuality(photoUrl);

      // Auto-fill checklist based on AI
      setChecklistItem(checkItem, analysis[checkItem]);
      setConfidence(analysis.confidence);
    } else {
      // ESP32: Manual verification
      setChecklistItem(checkItem, 'pending_review');
    }

    // 3. Store photo with metadata
    await storeQualityPhoto({
      photoUrl,
      checkItem,
      cameraType: camera.type,
      aiAnalysis: camera.type === 'recamera' ? analysis : null
    });
  };

  return (
    <div>
      <CameraPreview camera={camera} />
      <CaptureButton onClick={handleCapture} />

      {camera.type === 'recamera' && (
        <AIAnalysisPanel analysis={lastAnalysis} />
      )}
    </div>
  );
}
```

---

## Implementation Phases

### Phase 1: Basic QC Module (Week 1)
- ✅ Database schema
- ✅ Station management UI
- ✅ Basic checklist interface
- ✅ ESP32 camera integration (already done!)
- ✅ Manual photo verification

### Phase 2: Workflow Integration (Week 2)
- Order linking
- Batch mode
- Quality metrics dashboard
- Pass/fail logic
- Manager alerts

### Phase 3: RE:Camera Integration (Week 3)
- RE:Camera device driver
- AI analysis integration
- Auto-verification for supported checks
- Confidence scoring
- Hybrid manual + AI workflow

### Phase 4: Advanced Features (Week 4)
- Quality trend analysis
- Predictive quality alerts
- Training mode for new workers
- Compliance reporting (FDA, local health)
- Customer-facing "quality verified" badges

---

## API Endpoints Needed

```typescript
// Quality Control APIs

// Stations
GET    /api/quality/stations
POST   /api/quality/stations
PATCH  /api/quality/stations/:id

// Checks
GET    /api/quality/checks
POST   /api/quality/checks
PATCH  /api/quality/checks/:id
GET    /api/quality/checks/:id/photos

// Templates
GET    /api/quality/templates
POST   /api/quality/templates
PATCH  /api/quality/templates/:id

// Reports
GET    /api/quality/metrics?start=2025-10-01&end=2025-10-29
GET    /api/quality/metrics/station/:id
GET    /api/quality/export/csv

// RE:Camera specific
POST   /api/cameras/recamera/:id/analyze
GET    /api/cameras/recamera/:id/capabilities
```

---

## Benefits

### For Workers:
- ✅ **One Interface** - Everything in Laura dashboard
- ✅ **Guided Workflow** - Checklist tells them what to do
- ✅ **Fast** - Click, photo, done
- ✅ **No Training** - Intuitive UI

### For Managers:
- ✅ **Visibility** - See all QC in real-time
- ✅ **Metrics** - Pass rates, trends, issues
- ✅ **Audit Trail** - Every check documented with photos
- ✅ **Compliance** - Ready for health inspections

### For Customers:
- ✅ **Trust** - See quality verification on receipt
- ✅ **Transparency** - View photos of their order being inspected
- ✅ **Safety** - Temperature and freshness verified

### For Business:
- ✅ **Cost Savings** - Catch errors before delivery
- ✅ **Reduced Disputes** - Photo proof of quality
- ✅ **Process Improvement** - Identify bottlenecks
- ✅ **Competitive Advantage** - "Quality verified" marketing

---

## Next Steps

Want me to build this? I can:

1. ✅ **Create database migrations** for quality control tables
2. ✅ **Build Quality Control page** at `/quality-control`
3. ✅ **Create station management** interface
4. ✅ **Build check interface** with camera controls
5. ✅ **Implement order linking**
6. ✅ **Add quality metrics** dashboard
7. ✅ **Create RE:Camera adapter** (once you share device specs)

This is **100% viable** and actually a **game-changer** for food logistics QC! 🚀
