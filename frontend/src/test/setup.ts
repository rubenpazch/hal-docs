import '@testing-library/jest-dom'

// Mock CSS Modules — return a Proxy that gives back the key as the class name
// so className lookups like styles.foo === "foo" work in tests
vi.mock('*.module.css', () => {
  return {
    default: new Proxy({} as Record<string, string>, {
      get: (_, key) => (typeof key === 'string' ? key : ''),
    }),
  }
})
