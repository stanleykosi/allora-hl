/**
 * @description
 * Barrel file for exporting all custom type definitions from the /types directory.
 * This allows for cleaner imports elsewhere in the application.
 *
 * Example:
 * Instead of: import { ActionState } from '@/types/actions-types';
 * Use: import { ActionState } from '@/types';
 *
 * As more type files are added (e.g., `hyperliquid-types.ts`),
 * export them from here as well:
 * export * from './hyperliquid-types';
 */

// Export types related to Server Action states
export * from "./actions-types";

// Export types related to Hyperliquid API interactions
export * from "./hyperliquid-types";

// Export types related to Allora API interactions
export * from "./allora-types";

// Export types related to Trade Templates
export * from "./template-types";

// Export types related to Trade Logs
export * from "./log-types";

// Export types related to Application Settings
export * from "./settings-types";

// Future exports for other type definitions will be added here, for example:
// export * from './common-types';


// Export generic JSX type definition file (if needed, can conflict with React's global JSX)
// export * from "./jsx"; // Assuming jsx.d.ts exists and is correctly structured
// Note: Avoid exporting global namespace augmentation like jsx.d.ts unless necessary and handled carefully.