/**
 * Test setup for HyperNode-Provisioner
 */
import "@testing-library/jest-dom"
import { vi } from "vitest"

// Mock Next.js modules
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
  }),
}))

// Mock image assets
vi.mock("*.png", () => ({}))
vi.mock("*.jpg", () => ({}))
vi.mock("*.svg", () => ({}))

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
