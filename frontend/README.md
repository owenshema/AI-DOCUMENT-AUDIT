# AI Audit System - Frontend

Modern React frontend for the AI-Powered Document Audit and Management System with role-based access control, dark mode, and responsive design.

## Features

- 🎨 **Beautiful UI** - Modern design with Tailwind CSS
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 🔐 **Role-Based Access** - Multiple user roles with different permissions
  - Administrator - Full system access
  - Auditor - Create audits and generate reports
  - Document Manager - Upload and manage documents
  - Viewer - Read-only access
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🚀 **Fast & Optimized** - Built with React and modern tooling
- 🔌 **API Integration** - Connected to backend API
- 🎯 **TypeScript Ready** - Extensible architecture

## Getting Started

### Prerequisites

- Node.js 16+ (or npm 7+)
- Backend API running on http://localhost:4000

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start development server
npm start
```

The application will open at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

## Project Structure

```
frontend/
├── public/                 # Static files
│   └── index.html         # Main HTML file
├── src/
│   ├── components/        # Reusable components
│   │   ├── Navigation.jsx
│   │   └── ProtectedRoute.jsx
│   ├── pages/            # Page components
│   │   ├── HomePage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   └── DashboardPage.jsx
│   ├── api/              # API clients and endpoints
│   │   ├── client.js
│   │   └── auth.js
│   ├── store/            # State management (Zustand)
│   │   └── authStore.js
│   ├── index.css         # Global styles
│   └── App.jsx           # Main app component
├── package.json
├── tailwind.config.cjs
└── postcss.config.js
```

## Available Routes

### Public Routes
- `/` - Landing page with features overview
- `/login` - User login
- `/register` - User registration

### Protected Routes
- `/dashboard` - Main dashboard (all authenticated users)
- `/documents` - Document management (all users)
- `/compliance` - Compliance dashboard (auditors & admins)
- `/admin` - Admin panel (administrators only)

## Styling

The frontend uses **Tailwind CSS** for styling with:
- Dark mode support (class-based)
- Custom color palette (primary colors)
- Custom CSS classes for common components
- Responsive design patterns

### Dark Mode

Toggle dark mode using the sun/moon icon in the navigation bar. The preference is saved to local storage.

## Authentication

The app uses JWT token-based authentication:

1. User logs in or registers
2. Backend returns JWT token and user data
3. Token stored in localStorage
4. Token automatically added to API requests
5. Token validated on protected routes

### Demo Credentials

```
Admin Account:
Email: admin@example.com
Password: password123

Auditor Account:
Email: auditor@example.com
Password: password123

Manager Account:
Email: manager@example.com
Password: password123

Viewer Account:
Email: viewer@example.com
Password: password123
```

## State Management

Uses **Zustand** for state management:

```javascript
// Access auth store
const { user, token, logout, isDarkMode, toggleDarkMode } = useAuthStore();
```

## API Integration

All API calls go through `axios` client with automatic:
- Token injection in Authorization header
- Request/response interceptors
- Error handling and redirect on 401

### API Endpoints Used

- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /documents` - Get user documents
- `POST /documents` - Upload document
- `PUT /documents/:id` - Update document
- `DELETE /documents/:id` - Delete document
- `GET /compliance` - Get compliance data
- `GET /audit-logs` - Get audit logs

## Customization

### Adding New Pages

1. Create component in `src/pages/`
2. Add route in `App.jsx`
3. Use `<ProtectedRoute>` for protected pages
4. Use `requiredRole` prop for role-based access

Example:
```jsx
<Route
  path="/reports"
  element={
    <ProtectedRoute requiredRole="auditor">
      <ReportsPage />
    </ProtectedRoute>
  }
/>
```

### Updating API Endpoints

Edit `src/api/auth.js` to add new API calls:

```javascript
export const reportAPI = {
  getAll: async () => {
    const response = await apiClient.get('/reports');
    return response.data;
  },
};
```

## Performance Optimization

- Code splitting with React Router
- Lazy loading of components
- Image optimization
- CSS minification with Tailwind
- Production build optimization

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### CORS Errors
Make sure backend has CORS enabled and running on correct port.

### Token Expiration
Tokens expire after 24 hours. Users will be redirected to login page.

### API Connection Issues
Check that:
1. Backend is running on http://localhost:4000
2. `.env.local` has correct `REACT_APP_API_URL`
3. Network tab shows API requests in browser DevTools

## Contributing

This is a demonstration project. For production use, consider:
- Adding TypeScript
- Implementing token refresh logic
- Adding error boundaries
- Comprehensive error handling
- Unit and integration tests
- E2E tests with Cypress

## License

MIT License - See LICENSE file for details
