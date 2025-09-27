# RPApp Kiosk

A modern React-based kiosk application for retail point-of-sale systems. This kiosk app allows customers to browse products, generate QR codes for payments, and complete purchases through a touch-friendly interface.

## Features

- **Product Display**: Touch-friendly product grid with images and descriptions
- **QR Code Payments**: Generate QR codes for Czech payment standards (SPD)
- **Real-time Updates**: WebSocket integration for live product updates
- **Admin Control**: Controlled by separate admin dashboard
- **Responsive Design**: Optimized for kiosk displays and touch interfaces
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Accessibility**: Full keyboard navigation and screen reader support

## Architecture

This kiosk app is designed to work with:

- **Backend**: `rpapp-backend` - Handles products, payments, and WebSocket connections
- **Admin Dashboard**: `admin-app` - Manages products and kiosk inventory
- **Shared Package**: `pi-kiosk-shared` - Common types, utilities, and configurations

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend server running on port 3015
- Admin dashboard for product management

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Environment Configuration

The app uses environment variables for configuration:

```bash
# .env.development
REACT_APP_API_URL=http://localhost:3015
REACT_APP_WS_URL=ws://localhost:3015
REACT_APP_ENABLE_MOCK_PAYMENTS=true
REACT_APP_PAYMENT_MODE=mock
```

## Testing

This project includes comprehensive testing with Jest and React Testing Library:

### Test Types

- **Unit Tests**: Individual component and hook testing
- **Integration Tests**: Full user flow testing
- **Accessibility Tests**: Screen reader and keyboard navigation

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### Test Structure

```
src/
├── components/
│   ├── *.test.tsx          # Component unit tests
├── hooks/
│   ├── *.test.ts           # Hook unit tests
├── __tests__/
│   ├── integration.test.tsx # Integration tests
│   └── setup.ts            # Integration test setup
└── setupTests.ts           # Unit test setup
```

## API Integration

### Backend Endpoints

The kiosk connects to the backend via these endpoints:

- `GET /api/products?kioskId={id}` - Fetch products for specific kiosk
- `POST /api/products/{id}/click` - Track product clicks
- `GET /api/check-new-transactions` - Check for completed payments
- `WebSocket /?kioskId={id}` - Real-time updates

### WebSocket Messages

The kiosk listens for these WebSocket message types:

- `product_update` - Product data changes
- `inventory_updated` - Stock level changes
- `product_created` - New products added
- `product_updated` - Product information updated

## Component Architecture

### Core Components

- **App**: Main application container with routing
- **ProductGrid**: Displays products in touch-friendly grid
- **PaymentForm**: Handles email input and QR generation
- **QRDisplay**: Shows QR code and payment status
- **ConfirmationScreen**: Payment success confirmation
- **ConnectionStatus**: Shows backend connection status
- **ErrorBoundary**: Catches and displays errors gracefully

### Custom Hooks

- **useProducts**: Manages product data and API calls
- **useWebSocket**: Handles real-time connection
- **useErrorHandler**: Centralized error handling
- **useAsyncOperation**: Async operation management

## Development

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- React best practices and patterns

### Key Patterns

- **Error Boundaries**: Graceful error handling
- **Custom Hooks**: Reusable logic extraction
- **Context API**: State management
- **SWR**: Data fetching and caching
- **Accessibility**: ARIA labels and keyboard navigation

## Deployment

### Production Build

```bash
npm run build
```

The build creates optimized static files in the `dist/` directory.

### Environment Variables

Set these environment variables for production:

```bash
REACT_APP_API_URL=https://your-backend-url.com
REACT_APP_WS_URL=wss://your-backend-url.com
REACT_APP_ENABLE_MOCK_PAYMENTS=false
REACT_APP_PAYMENT_MODE=production
```

### Railway Deployment

The app is configured for Railway deployment with:

- Automatic builds on git push
- Environment-specific configurations
- Health checks and monitoring

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**

   - Check backend server is running
   - Verify WebSocket URL configuration
   - Check network connectivity

2. **Products Not Loading**

   - Verify backend API is accessible
   - Check kiosk ID parameter
   - Review browser console for errors

3. **QR Code Generation Fails**
   - Check QRCode library installation
   - Verify payment configuration
   - Review error logs

### Debug Mode

Enable debug mode by setting:

```bash
REACT_APP_SHOW_DEBUG_INFO=true
REACT_APP_LOG_LEVEL=debug
```

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation
4. Test on actual kiosk hardware when possible

## License

Private project - All rights reserved.
