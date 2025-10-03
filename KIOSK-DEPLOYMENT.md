# Kiosk Instance Deployment Guide

This guide explains how to deploy individual kiosk instances for the RPApp Kiosk system.

## Overview

Each kiosk instance is identified by a unique `kioskId` parameter in the URL. The app validates this ID and only loads when a valid kiosk ID is provided.

## URL Structure

Each kiosk instance should be accessed with the following URL pattern:

```
https://your-domain.com?kioskId=X
```

Where `X` is the kiosk ID number (positive integer).

### Examples:

- Kiosk #1: `https://kiosk.example.com?kioskId=1`
- Kiosk #2: `https://kiosk.example.com?kioskId=2`
- Kiosk #5: `https://kiosk.example.com?kioskId=5`

## Prerequisites

1. **Backend Server**: Ensure the backend is running and accessible
2. **Database**: Kiosk records must exist in the database
3. **Inventory**: Products must have inventory records for each kiosk

## Deployment Methods

### Method 1: Single App Instance (Recommended)

Deploy one instance of the kiosk app and access different kiosks via URL parameters:

```bash
# Build the app
npm run build

# Deploy to your hosting platform
# Access different kiosks via:
# https://your-domain.com?kioskId=1
# https://your-domain.com?kioskId=2
# https://your-domain.com?kioskId=3
```

### Method 2: Multiple App Instances

Deploy separate instances for each kiosk (useful for different domains/subdomains):

```bash
# For each kiosk, create a separate deployment
# Kiosk 1: https://kiosk1.example.com
# Kiosk 2: https://kiosk2.example.com
# Kiosk 3: https://kiosk3.example.com
```

## Environment Configuration

### Required Environment Variables

```bash
# API Configuration
REACT_APP_API_URL=https://your-backend.com
REACT_APP_WS_URL=wss://your-backend.com

# Environment
REACT_APP_ENVIRONMENT=production

# Payment Configuration
REACT_APP_ENABLE_MOCK_PAYMENTS=false
REACT_APP_PAYMENT_MODE=production
```

### Example .env.production

```bash
REACT_APP_API_URL=https://api.rpapp.com
REACT_APP_WS_URL=wss://api.rpapp.com
REACT_APP_ENVIRONMENT=production
REACT_APP_ENABLE_MOCK_PAYMENTS=false
REACT_APP_PAYMENT_MODE=production
```

## Kiosk Setup in Database

Before deploying, ensure kiosk records exist in your database:

```sql
-- Example kiosk records
INSERT INTO kiosks (id, name, location, description, isActive) VALUES
(1, 'Main Store', 'Prague Airport, Terminal 1', 'Primary kiosk location', true),
(2, 'Terminal 2', 'Prague Airport, Terminal 2', 'Secondary kiosk location', true),
(3, 'Shopping Center', 'Prague City Center', 'Shopping center kiosk', true);

-- Ensure inventory exists for each kiosk
-- (This is typically done via the admin interface)
```

## Error Handling

The app includes comprehensive error handling for invalid kiosk configurations:

### Common Errors and Solutions

1. **Missing Kiosk ID**

   - Error: "Kiosk ID is required"
   - Solution: Add `?kioskId=X` to the URL

2. **Invalid Kiosk ID**

   - Error: "Invalid kiosk ID: X"
   - Solution: Use a positive integer (1, 2, 3, etc.)

3. **Kiosk Not Found**
   - Error: "No products available"
   - Solution: Ensure kiosk exists in database and has inventory

## Testing Individual Kiosks

### Local Testing

```bash
# Start development server
npm run dev

# Test different kiosk IDs
# http://localhost:5173?kioskId=1
# http://localhost:5173?kioskId=2
# http://localhost:5173?kioskId=3
```

### Production Testing

1. Deploy the app to your hosting platform
2. Test each kiosk URL:
   - `https://your-domain.com?kioskId=1`
   - `https://your-domain.com?kioskId=2`
   - `https://your-domain.com?kioskId=3`
3. Verify each kiosk shows its specific inventory
4. Test payment flow for each kiosk

## Monitoring and Maintenance

### Health Checks

Monitor each kiosk instance:

```bash
# Check if kiosk is responding
curl "https://your-domain.com?kioskId=1"

# Check backend API
curl "https://your-backend.com/api/products?kioskId=1"
```

### Logs

Monitor application logs for:

- Kiosk ID validation errors
- Product loading issues
- Payment processing errors
- WebSocket connection problems

## Security Considerations

1. **URL Validation**: The app validates kiosk IDs to prevent injection attacks
2. **Error Messages**: Error messages don't expose sensitive system information
3. **CORS**: Ensure proper CORS configuration for your domain
4. **HTTPS**: Always use HTTPS in production

## Troubleshooting

### Kiosk Not Loading

1. Check URL format: `?kioskId=X`
2. Verify kiosk exists in database
3. Check backend connectivity
4. Review browser console for errors

### No Products Showing

1. Verify kiosk has inventory records
2. Check product active status
3. Verify inventory quantities > 0
4. Check backend API response

### Payment Issues

1. Verify payment configuration
2. Check backend payment endpoints
3. Review payment mode settings
4. Test with mock payments first

## Support

For issues with kiosk deployment:

1. Check this documentation
2. Review error messages in the app
3. Check backend logs
4. Verify database configuration
5. Contact system administrator
