// tests/setup.ts
// Global test setup — loaded by vitest before every test file (all environments)
// Extends vitest's expect with @testing-library/jest-dom matchers so component
// tests can use .toBeInTheDocument(), .toBeDisabled(), etc.
// Also registers afterEach cleanup so RTL unmounts components between tests
// (required because vitest uses globals:false — cleanup is not auto-registered)

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(cleanup);
