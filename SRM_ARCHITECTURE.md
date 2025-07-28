# Space Requirement Matrix (SRM) Architecture

## Overview
The SRM system integrates space requirements with historical cost data to provide accurate project cost estimations.

## Data Flow Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SRM Input     │───▶│  JSON Parser    │───▶│ Room Type       │
│   (Excel/CSV)   │    │                 │    │ Matcher         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Cost Output    │◀───│ Room Configurator│◀───│ Room Instance   │
│  (Estimation)   │    │                 │    │ Creator         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Historical Data │◀───│  Data Lookup    │◀───│  Project Setup  │
│   Repository    │    │  (Country/Region)│    │  (Budget/Costs) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Component Details

### 1. SRM Input Processor
- **Input**: Excel/CSV file with room counts
- **Output**: Structured JSON with room types and quantities
- **Validation**: Room type mapping and count validation

### 2. Historical Data Lookup Engine
- **Priority Order**:
  1. Country-level lookup
  2. Region-level lookup  
  3. Cross-region lookup
  4. Propose new room type creation

### 3. Room Type Matcher
- **I-spaces Mapping**:
  - Open workstations
  - Partner cabins
  - CO/MDP cabins
  - Partner rooms

- **We-spaces Mapping**:
  - Focus rooms (2p)
  - Meeting rooms (4p, 6p, 8p)
  - Case team rooms (small, medium, 6p)
  - Board rooms
  - MPR (Multi-Purpose Room)
  - Divisible rooms

### 4. Room Instance Creator
- Creates room_instance records
- Links to existing room_type data
- Maintains count and configuration

### 5. Cost Calculator
- **Inputs**:
  - Room instance counts (from SRM)
  - Historical cost data (from room_configurations)
  - Project costs (labour, network, miscellaneous)
  - Budget constraints

- **Output**: Total project cost estimation

## Database Schema Updates

### New Collections/Tables:

1. **srm_projects**
   ```json
   {
     "id": "uuid",
     "project_name": "string",
     "country": "string",
     "region": "string",
     "budget": "number",
     "labour_cost": "number",
     "network_cost": "number",
     "miscellaneous_cost": "number",
     "srm_data": "json",
     "created_at": "timestamp",
     "updated_at": "timestamp"
   }
   ```

2. **srm_room_instances**
   ```json
   {
     "id": "uuid",
     "srm_project_id": "uuid",
     "room_type_id": "uuid",
     "room_name": "string",
     "space_type": "i-space|we-space",
     "count": "number",
     "estimated_cost": "number",
     "status": "proposed|approved|created"
   }
   ```

3. **srm_historical_lookup**
   ```json
   {
     "id": "uuid",
     "room_type": "string",
     "country": "string",
     "region": "string",
     "project_id": "uuid",
     "cost_data": "json",
     "last_used": "timestamp"
   }
   ```

## API Endpoints

### SRM Management
- `POST /api/srm/upload` - Upload SRM file
- `POST /api/srm/process` - Process SRM data
- `GET /api/srm/projects` - List SRM projects
- `GET /api/srm/projects/:id` - Get project details

### Room Type Matching
- `POST /api/srm/match-rooms` - Match room types
- `GET /api/srm/historical/:country/:region` - Get historical data
- `POST /api/srm/propose-room` - Propose new room type

### Cost Calculation
- `POST /api/srm/calculate-cost` - Calculate project cost
- `GET /api/srm/estimates/:project_id` - Get cost estimates

## Implementation Phases

### Phase 1: Project Data Page Enhancement ✅
- [x] Rename "Room Cost" to "Project Data"
- [x] Add SRM upload functionality
- [x] SRM to JSON conversion
- [x] Project creation with SRM data

### Phase 2: Room Mapping Interface ✅
- [x] Create room mapping page
- [x] Display SRM rooms on left side
- [x] Show existing room types on right side
- [x] Country → Region → Cross-region lookup
- [x] New room type creation option
- [x] Progress tracking and validation

### Phase 3: Room Configuration ✅
- [x] Final room configuration page
- [x] Component selection interface
- [x] Cost calculation and estimation
- [x] PM approval and submission workflow
- [x] Room instance creation
- [x] AV bill of material generation

### Phase 4: Enhanced Summary & Dashboard
- [ ] Updated summary with room costs + counts
- [ ] Total cost calculation (including network, etc.)
- [ ] Dashboard intelligence and analytics

### Phase 5: Workflow Integration
- [ ] Seamless flow between all pages
- [ ] Data persistence and state management
- [ ] Error handling and validation

## File Structure

```
app/
├── api/
│   ├── srm/
│   │   ├── upload/
│   │   ├── process/
│   │   ├── match-rooms/
│   │   └── calculate-cost/
├── components/
│   ├── SRMUploader.tsx
│   ├── SRMProcessor.tsx
│   ├── RoomTypeMatcher.tsx
│   └── CostCalculator.tsx
├── lib/
│   ├── srm/
│   │   ├── parser.ts
│   │   ├── matcher.ts
│   │   ├── calculator.ts
│   │   └── types.ts
└── pages/
    ├── srm/
    │   ├── upload.tsx
    │   ├── process.tsx
    │   └── results.tsx
```

## Next Steps

1. **Hide current SRM page** (as requested)
2. **Create SRM upload interface**
3. **Implement JSON parser for SRM data**
4. **Build room type matching logic**
5. **Integrate with existing room_type system**
6. **Create cost calculation engine**

Would you like to start with any specific phase or component? 