# Scrooge Global Bank CRM Frontend

A comprehensive Customer Relationship Management (CRM) system frontend built with React for banking professionals to manage client relationships, accounts, and transactions.

## Features

### Authentication & Authorization
- **OAuth 2.0** integration with AWS Cognito
- **Role-based access control** (Admin and Agent roles)
- **Multi-factor authentication** support
- Secure session management

### Admin Portal Features
- **User Management**: Create, update, and disable system users
- **System Overview**: Dashboard with key performance metrics
- **Complete Access**: Full access to all clients, accounts, and transactions
- **User Analytics**: Track agent performance and system usage

### Agent Portal Features
- **Client Management**: Create and manage client profiles with full validation
- **Account Management**: Open and manage client bank accounts
- **Transaction Viewing**: Monitor client transactions and account activity
- **Personal Dashboard**: View assigned clients and recent activity

### Core Functionality
- **Client Profile Management**: Complete CRUD operations with data validation
- **Account Operations**: Support for Savings, Checking, and Business accounts
- **Transaction Monitoring**: Real-time transaction tracking with SFTP integration
- **Audit Logging**: Complete audit trail for all system operations
- **Responsive Design**: Mobile-first responsive design with Tailwind CSS

## Technology Stack

- **React 19.1** - Frontend framework
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API requests
- **AWS Amplify** - Authentication and AWS integration
- **Vite** - Build tool and development server

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.jsx
│   ├── Layout.jsx       # Dashboard layout wrapper
│   ├── LoadingSpinner.jsx
│   └── UserCard.jsx
├── pages/               # Main application pages
│   ├── AdminDashboard.jsx      # Admin portal dashboard
│   ├── AgentDashboard.jsx      # Agent portal dashboard
│   ├── ClientManagement.jsx   # Client CRUD operations
│   ├── AccountManagement.jsx  # Account management
│   ├── TransactionView.jsx    # Transaction monitoring
│   ├── UserManagement.jsx     # User administration
│   ├── LoginPage.jsx          # Authentication page
│   └── CallbackPage.jsx       # OAuth callback handler
├── services/            # API and service layer
│   ├── authService.js   # Authentication logic
│   └── apiService.js    # API client and endpoints
└── utils/               # Utility functions and helpers
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- AWS Cognito User Pool configured
- Backend API server running

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the frontend directory:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   VITE_COGNITO_USER_POOL_ID=your-user-pool-id
   VITE_COGNITO_CLIENT_ID=your-client-id
   VITE_COGNITO_DOMAIN=your-cognito-domain
   VITE_AWS_REGION=your-aws-region
   VITE_REDIRECT_URI=http://localhost:5173/callback
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

### Building for Production

```bash
npm run build
npm run preview
```

## API Integration

### Authentication Flow
The frontend uses AWS Cognito for authentication with the following flow:
1. User clicks "Sign In" → Redirects to Cognito Hosted UI
2. After authentication → Redirects to `/callback`
3. Extract tokens and redirect based on user role

### API Endpoints
All API calls are handled through the `apiService.js` with automatic token injection:

```javascript
// Example usage
import { clientApi, accountApi, transactionApi } from '../services/apiService';

// Get all clients
const clients = await clientApi.getAllClients();

// Create new account
const newAccount = await accountApi.createAccount(accountData);

// Get transactions
const transactions = await transactionApi.getAllTransactions({ status: 'Completed' });
```

## User Roles & Permissions

### Admin Role
- Access to admin dashboard (`/admin`)
- User management (`/users`)
- Complete system overview
- All client and account access

### Agent Role
- Access to agent dashboard (`/agent`)
- Manage assigned clients only
- Create and manage client accounts
- View client transactions

## Component Usage

### Layout Components
```jsx
import { DashboardLayout, PageHeader, StatCard } from '../components/Layout';

function MyPage() {
  return (
    <DashboardLayout userRole="agent" title="My Page">
      <PageHeader 
        title="Client Management" 
        description="Manage your client relationships"
        action={<button>Add Client</button>}
      />
      {/* Page content */}
    </DashboardLayout>
  );
}
```

### Loading States
```jsx
import { LoadingSpinner, LoadingPage } from '../components/LoadingSpinner';

// In component
{loading ? <LoadingSpinner /> : <ContentComponent />}

// Full page loading
<LoadingPage message="Loading client data..." />
```

## Form Validation

### Client Creation Validation
- **First/Last Name**: 2-50 characters, alphabetic only
- **Email**: Valid email format, unique across system
- **Phone**: 10-15 digits, unique across system
- **Date of Birth**: Valid date, age 18-100 years
- **Gender**: Required selection from predefined options

### Account Creation Validation
- **Client Selection**: Must select existing client
- **Initial Deposit**: Must be greater than 0
- **Account Type**: Savings, Checking, or Business
- **Currency**: SGD, USD, EUR support

## Styling Guidelines

### Tailwind CSS Classes
The application uses consistent styling patterns:

- **Primary Colors**: Blue (600-700) for primary actions
- **Success**: Green (600-700) for positive actions
- **Warning**: Yellow (500-600) for pending states
- **Danger**: Red (600-700) for destructive actions
- **Neutral**: Gray (50-900) for backgrounds and text

### Responsive Design
All components are mobile-first responsive:
- Base: Mobile (320px+)
- `sm:` Tablet (640px+)
- `md:` Desktop (768px+)
- `lg:` Large Desktop (1024px+)

## Security Considerations

### Authentication
- JWT tokens stored securely in memory
- Automatic token refresh
- Secure logout clearing all session data

### API Security
- All API requests include authentication headers
- Automatic 401 handling with redirect to login
- CORS properly configured for production

### Data Protection
- PII data validation and sanitization
- Audit logging for all CRUD operations
- Role-based data access control

## Error Handling

### API Error Handling
```javascript
try {
  const response = await clientApi.createClient(clientData);
  // Handle success
} catch (error) {
  if (error.response?.status === 400) {
    // Handle validation errors
  } else if (error.response?.status === 401) {
    // Automatic redirect to login
  } else {
    // Handle other errors
  }
}
```

### Form Error Display
```jsx
{errors.firstName && (
  <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
)}
```

## Performance Optimization

### Code Splitting
- Lazy loading of route components
- Dynamic imports for heavy components
- Optimized bundle size

### API Optimization
- Request deduplication
- Caching for reference data
- Pagination for large datasets

## Testing

### Running Tests
```bash
npm run test
```

### Test Coverage
- Component unit tests
- API integration tests
- Authentication flow tests
- Form validation tests

## Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

### Environment Variables for Production
```env
VITE_API_BASE_URL=https://api.scroogebank.com
VITE_COGNITO_USER_POOL_ID=prod-user-pool-id
VITE_COGNITO_CLIENT_ID=prod-client-id
VITE_COGNITO_DOMAIN=prod-cognito-domain
VITE_AWS_REGION=us-east-1
VITE_REDIRECT_URI=https://crm.scroogebank.com/callback
```

## Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation
4. Submit pull request

### Code Standards
- ESLint configuration enforced
- Prettier for code formatting
- Component naming conventions
- Consistent file structure

## Troubleshooting

### Common Issues

**Authentication Redirect Loop**
- Check Cognito configuration
- Verify redirect URIs match exactly
- Clear browser cache and cookies

**API Connection Issues**
- Verify backend server is running
- Check CORS configuration
- Confirm environment variables

**Build Failures**
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify all dependencies are installed

## Future Enhancements

### Planned Features
- **Real-time Notifications**: WebSocket integration for real-time updates
- **Advanced Analytics**: Enhanced reporting and analytics dashboard
- **Mobile App**: React Native mobile application
- **AI Assistant**: Integration with LLM for intelligent client assistance
- **Document Management**: File upload and document storage
- **Multi-language Support**: Internationalization (i18n)

### Technical Improvements
- **Progressive Web App**: PWA capabilities
- **Offline Support**: Service worker implementation
- **Enhanced Security**: Additional security headers and CSP
- **Performance Monitoring**: Application performance monitoring

## License

This project is proprietary software for Scrooge Global Bank's internal use only.

## Support

For technical support or questions:
- **Internal Documentation**: Check internal wiki
- **Development Team**: Contact via internal channels
- **Bug Reports**: Use internal issue tracking system
