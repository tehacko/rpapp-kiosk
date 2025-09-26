# Pi Kiosk App - Customer Interface

The customer-facing interface for the Pi Kiosk system, built with React and TypeScript.

## 🚀 Features

- **Product Browsing**: View available food and beverage items
- **QR Payment**: Generate QR codes for seamless payments
- **Real-time Updates**: Live inventory and order status updates
- **Touch-Friendly UI**: Optimized for kiosk touchscreen interfaces
- **Responsive Design**: Works on various screen sizes
- **Error Handling**: Robust error handling and retry mechanisms

## 🛠 Tech Stack

- **React 18** - Modern React with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **React Testing Library** - Comprehensive testing
- **Jest** - Test runner
- **CSS3** - Modern styling with CSS variables
- **QRCode.js** - QR code generation
- **WebSocket** - Real-time communication

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/rpapp-kiosk.git
cd rpapp-kiosk

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🏗 Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🚀 Deployment

This app is configured for automatic deployment to Railway:

1. **Push to main branch** triggers automatic deployment
2. **Tests must pass** before deployment proceeds
3. **Production build** is created and served

### Environment Variables

Configure these in your Railway service:

- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_WS_URL` - WebSocket URL for real-time updates
- `REACT_APP_ENVIRONMENT` - Environment (development/production)

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── PaymentForm.tsx  # Payment and QR generation
│   ├── ProductGrid.tsx  # Product display
│   ├── QRDisplay.tsx    # QR code display
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useProducts.ts  # Product data management
│   ├── useWebSocket.ts # Real-time communication
│   └── ...
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run lint` - Lint code

### Code Quality

- **TypeScript** for type safety
- **ESLint** for code linting
- **Jest** for comprehensive testing
- **React Testing Library** for component testing

## 🌐 API Integration

The kiosk app integrates with the Pi Kiosk backend:

- **Products**: Fetch available items and inventory
- **Orders**: Create and track customer orders
- **Payments**: Generate QR codes and handle payment flow
- **WebSocket**: Real-time updates for inventory and order status

## 🎨 UI/UX Features

- **Touch-Optimized**: Large buttons and touch targets
- **High Contrast**: Clear visibility in various lighting
- **Loading States**: Smooth loading indicators
- **Error Recovery**: User-friendly error messages and retry options
- **Accessibility**: ARIA labels and keyboard navigation

## 📱 Responsive Design

- **Desktop**: Full-screen kiosk mode
- **Tablet**: Touch-optimized layout
- **Mobile**: Compact mobile-friendly interface

## 🔒 Security

- **Input Validation**: All user inputs are validated
- **XSS Protection**: Proper data sanitization
- **HTTPS**: Secure communication in production
- **Environment Isolation**: Separate dev/prod configurations

## 🚀 Deployment Pipeline

1. **Code Push** → GitHub repository
2. **Tests Run** → Jest test suite
3. **Build** → Vite production build
4. **Deploy** → Railway hosting
5. **Health Check** → Automatic service verification

## 📊 Monitoring

- **Health Checks**: Automatic service monitoring
- **Error Tracking**: Comprehensive error logging
- **Performance**: Build size and load time optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Related Projects

- [Pi Kiosk Backend](https://github.com/yourusername/rpapp-backend) - API and business logic
- [Pi Kiosk Admin](https://github.com/yourusername/rpapp-admin) - Management interface
- [Pi Kiosk Shared](https://www.npmjs.com/package/pi-kiosk-shared) - Shared components and utilities
