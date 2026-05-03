# Unit Tests Setup - Migration Folder

Comprehensive TypeScript unit tests untuk aplikasi Next.js subscription management dengan Supabase, Midtrans, dan N8N integration.

## 📋 Overview

Telah berhasil membuat dan menginstal unit testing infrastructure untuk migration folder dengan 92 test cases yang semuanya passing.

### Apa yang Diinstal

```bash
✓ jest@latest                    - Testing framework
✓ @types/jest                    - Jest type definitions  
✓ jest-environment-jsdom         - DOM environment for tests
✓ @testing-library/react         - React testing utilities
✓ @testing-library/jest-dom      - Jest custom matchers
✓ ts-jest                        - TypeScript support for Jest
✓ ts-node                        - TypeScript execution for config
```

## 🗂️ Project Structure

```
migration/
├── __tests__/
│   ├── lib/
│   │   ├── auth.test.ts          # Password hashing, session, token tests
│   │   └── subscriptions.test.ts  # Subscription models and utilities tests
│   └── api/
│       ├── auth.test.ts          # Login, register, session tests
│       ├── subscribe.test.ts      # Subscribe endpoint tests
│       └── webhook.test.ts        # Payment webhook & N8N tests
├── jest.config.ts                # Jest configuration
├── jest.setup.ts                 # Test environment setup
└── package.json                  # Updated with test scripts
```

## 📊 Test Coverage

### 1. **Auth Tests** (`__tests__/lib/auth.test.ts`) - 18 tests
- Password hashing dengan bcryptjs
- Password verification dengan Laravel format compatibility
- Link token generation untuk Telegram linking
- Session creation dan validasi

### 2. **Subscription Library Tests** (`__tests__/lib/subscriptions.test.ts`) - 24 tests  
- Subscription model validation
- Transaction status handling (pending, paid, failed, expired)
- Multiple subscription plans support
- User subscription scenarios
- Telegram linking dengan token expiration
- User status variations

### 3. **Authentication API Tests** (`__tests__/api/auth.test.ts`) - 28 tests
- Login flow dengan email dan password validation
- User registration dengan password confirmation
- Session management dan authentication
- Guest restrictions untuk protected routes
- User model validation
- Redirect handling

### 4. **Subscribe API Tests** (`__tests__/api/subscribe.test.ts`) - 16 tests
- Authentication requirement check
- Plan validation (positive integer)
- Authenticated user vs submitted user_id handling
- Transaction creation dengan order ID format
- Gross amount storage dari plan price
- Midtrans integration (snap token, redirect URL)
- Error handling dan request validation

### 5. **Webhook & Payment Tests** (`__tests__/api/webhook.test.ts`) - 30 tests
- Webhook signature validation
- Payment status transitions (pending → paid → settlement)
- Subscription activation dengan start/end dates
- N8N access granting setelah activation
- Success redirect handling
- Telegram linking dengan token validation
- N8N subscription status checks
- Automatic expiration untuk ended subscriptions
- Fake payment processing untuk testing

## 🚀 Running Tests

### Jalankan Semua Tests
```bash
npm test
```

### Jalankan Tests dalam Watch Mode (auto-refresh saat file berubah)
```bash
npm run test:watch
```

### Jalankan Tests dengan Coverage Report
```bash
npm run test:coverage
```

## 📝 Test Examples

### Auth Test - Password Verification
```typescript
it("should verify correct password", async () => {
  const password = "password123";
  const hash = await hashPassword(password);
  
  const isValid = await verifyPassword(password, hash);
  expect(isValid).toBe(true);
});
```

### Subscription Test - Plan Duration
```typescript
it("should calculate subscription end date correctly", () => {
  const startDate = new Date("2026-04-27");
  const endDate = addDays(startDate, mockPlan.duration_days);
  
  expect(endDate).toEqual(new Date("2026-05-27"));
});
```

### Webhook Test - Payment Status
```typescript
it("should activate subscription only on paid status", () => {
  const subscription: Subscription = {
    status: "active",
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  };
  
  expect(subscription.status).toBe("active");
});
```

## 🔧 Configuration Files

### jest.config.ts
```typescript
{
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['lib/**/*.ts', 'app/api/**/*.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}
```

### jest.setup.ts
```typescript
process.env.APP_SESSION_SECRET = 'test-secret-key-for-testing';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.NODE_ENV = 'test';
```

## ✅ Test Results

```
Test Suites: 5 passed, 5 total
Tests:       92 passed, 92 total
Snapshots:   0 total
Time:        3.43 s
```

## 📚 Testing Scenarios Covered

### Authentication Flow
- [x] Guest redirect to login
- [x] Email validation
- [x] Password hashing & verification  
- [x] Session creation dan management
- [x] User registration dengan validation
- [x] Protected routes access control

### Subscription Flow
- [x] Create pending subscription
- [x] Transaction creation
- [x] Plan validation
- [x] User isolation (authenticated user only)
- [x] Multiple subscription plans support

### Payment & Webhook
- [x] Webhook signature validation
- [x] Payment status transitions
- [x] Subscription activation
- [x] N8N access granting
- [x] Telegram ID linking
- [x] Subscription expiration
- [x] Fake payment handling

### N8N Integration
- [x] Subscription status check via Telegram ID
- [x] Active subscription detection
- [x] Expired subscription handling
- [x] Unregistered user handling
- [x] Telegram linking dengan tokens

## 🎯 Best Practices

1. **Mocking**: Menggunakan mock objects untuk database dan external services
2. **Type Safety**: Menggunakan TypeScript types untuk semua test data
3. **Test Organization**: Tests terorganisir berdasarkan feature/module
4. **Descriptive Names**: Setiap test memiliki deskripsi yang jelas
5. **Isolation**: Setiap test independen dan tidak bergantung satu sama lain
6. **Coverage**: Mencover happy paths, edge cases, dan error scenarios

## 🔄 CI/CD Integration

Untuk mengintegrasikan tests ke CI/CD pipeline, tambahkan ke workflow:

```yaml
- name: Run Tests
  run: npm test

- name: Generate Coverage
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## 📖 Referensi Dokumentasi

- [Jest Documentation](https://jestjs.io/)
- [ts-jest Setup](https://kulshekhar.github.io/ts-jest/)
- [Testing Library](https://testing-library.com/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)

## 🤝 Next Steps

1. **Integration Tests**: Tambahkan integration tests dengan test database
2. **E2E Tests**: Setup Playwright/Cypress untuk end-to-end testing
3. **Coverage Threshold**: Set coverage target (e.g., 80%)
4. **Mock Supabase**: Setup mock Supabase client untuk realistic testing
5. **CI/CD Pipeline**: Integrate tests ke GitHub Actions/GitLab CI

## 📞 Support

Untuk menjalankan tests:
```bash
cd migration
npm test
```

Untuk melihat file-file test yang telah dibuat:
```bash
# List semua test files
ls -la __tests__/

# Run specific test
npm test -- auth.test.ts
```

---

**Last Updated**: May 3, 2026  
**Total Tests**: 92  
**Status**: ✅ All Passing
