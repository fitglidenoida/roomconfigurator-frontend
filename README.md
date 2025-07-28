# Room Configuration System

A comprehensive room configuration and cost estimation tool for different room types across multiple regions, designed for Project Managers to make informed decisions about AV equipment and room setups.

## Features

### 🏢 **Room Type Management**
- **Excel Upload & Parsing**: Supports both multi-room sheets and one-sheet-per-room formats
- **Smart Room Categorization**: Automatically categorizes rooms based on capacity and features
- **Dynamic Room Creation**: PMs can create room types on-the-fly without approval
- **Professional Naming**: Uses industry-standard room type names (Partner/MDP Room, Standard Meeting Room, etc.)

### 💡 **Component Intelligence**
- **Smart Suggestions**: Popup-based component upgrade/downgrade suggestions
- **Cost Impact Analysis**: Real-time cost calculations for component changes
- **Regional Pricing**: Compare component costs across different regions
- **Feature Comparison**: Detailed feature analysis between components

### 📊 **PM Dashboard**
- **Real-time Cost Tracking**: Live updates across all cost calculations
- **Budget Analysis**: Cost vs budget with percentage indicators
- **Visual Analytics**: Charts and graphs for cost breakdown and regional comparisons
- **Cost Optimization**: Suggestions for budget-friendly alternatives
- **Project Overview**: Recent projects and their status

### 🔧 **Enhanced Configurator**
- **Component Management**: Add/remove components with instant price updates
- **Room Type Variants**: Compare different room configurations side-by-side
- **Real-time Updates**: All changes reflect immediately across the system
- **Cost Calculations**: Automatic markup and total cost calculations

### 🌍 **Regional Support**
- **Multi-Region**: NAMR, EMESA, APACME support
- **Currency Handling**: Automatic currency detection and conversion
- **Regional Pricing**: Component costs by region and country
- **Regional Intelligence**: Cost comparisons and optimization suggestions

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Strapi v5 (Headless CMS)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Excel Processing**: XLSX library
- **API**: Centralized API service with localhost:1337

## Getting Started

### Prerequisites
- Node.js 18+
- Strapi backend running on localhost:1337

### Installation
```bash
npm install
npm run dev
```

### Environment Setup
Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:1337/api
```

## Usage

### 1. **Project Setup** (`/summary`)
- Configure project metadata (region, country, budget)
- Upload Excel files for component data
- Set cost parameters (labour, inflation, network costs)

### 2. **Room Type Creation** (`/room-types`)
- Upload Excel files with room configurations
- Review parsed room types and components
- Create room types with component suggestions
- Accept/reject component alternatives

### 3. **Room Configuration** (`/`)
- Select room types and quantities
- View real-time cost calculations
- Add/remove components with instant updates
- Compare different room configurations

### 4. **Variant Comparison** (`/variants`)
- Compare different room type variants
- Side-by-side cost analysis
- Component selection and management
- Save custom configurations

### 5. **PM Dashboard** (`/dashboard`)
- Real-time project cost overview
- Budget vs actual analysis
- Regional cost comparisons
- Cost optimization suggestions
- Visual analytics and charts

## Excel File Formats

### Structure 1: Multi-Room Sheet
- One sheet with multiple room type columns
- Components listed in rows with quantities per room type
- Good for comparing components across room types

### Structure 2: One Sheet Per Room Type
- Each room type gets its own sheet
- Detailed component breakdown per room
- Better for detailed room configuration

## API Integration

The system uses a centralized API service (`app/lib/api.ts`) that:
- Handles all Strapi API calls
- Supports pagination for large datasets
- Provides consistent error handling
- Easy to switch between local and production environments

## Key Components

### Core Libraries
- `app/lib/api.ts` - Centralized API service
- `app/lib/excelParser.ts` - Excel file parsing and room type extraction
- `app/lib/componentSuggestions.ts` - Component matching and suggestion engine

### Pages
- `app/page.tsx` - Main room configurator
- `app/summary/page.tsx` - Project setup and Excel upload
- `app/variants/page.tsx` - Room variant comparison
- `app/room-types/page.tsx` - Room type creation from Excel
- `app/dashboard/page.tsx` - PM dashboard with analytics

### Components
- `app/components/ComponentSuggestionPopup.tsx` - Component suggestion modal

## Demo Features

### For Monday Demo:
1. **Excel Upload**: Upload real Excel files and see room types extracted
2. **Component Suggestions**: Click on components to see upgrade/downgrade options
3. **Real-time Cost Updates**: Change quantities and see immediate cost impact
4. **Dashboard Analytics**: View comprehensive cost analysis and charts
5. **Regional Intelligence**: Compare costs across different regions

### Intelligence Features:
- Component similarity matching
- Cost optimization suggestions
- Regional pricing insights
- Budget vs actual analysis
- Feature comparison between components

## Future Enhancements

### Phase 2 (ML Integration):
- Machine learning-based component matching
- Predictive cost analysis
- Advanced regional pricing algorithms
- Historical data analysis
- Automated room type categorization

### Additional Features:
- User authentication and role-based access
- Approval workflows for room type creation
- Advanced reporting and export capabilities
- Integration with external pricing APIs
- Mobile-responsive design

## Support

For technical support or feature requests, please contact the development team.

---

**Built for Project Managers to make informed decisions about room configurations and AV equipment costs.**
