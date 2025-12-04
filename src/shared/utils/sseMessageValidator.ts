/**
 * Production-grade SSE Message Validator
 * Validates SSE messages with Zod schema validation and comprehensive error handling
 */
import { z } from 'zod';
import type { SSEMessage } from '../../features/realtime/hooks/useServerSentEvents';

/**
 * SSE Message Schema - Validates message structure and types
 * Matches backend SSEService message format
 */
const SSEMessageSchema = z.object({
  type: z.string().min(1).describe('Message type identifier (connection, ping, product_update, etc.)'),
  message: z.string().optional().describe('Human-readable message (for connection type)'),
  kioskId: z.number().optional().describe('Kiosk ID (for connection type)'),
  updateType: z.string().optional().describe('Update type for specific events'),
  data: z.unknown().optional().describe('Message payload data'),
  timestamp: z.string().datetime().optional().describe('ISO 8601 timestamp'),
}).passthrough(); // Allow additional fields from backend

/**
 * Parse and validate SSE message with comprehensive error handling
 * 
 * @param rawData - Raw event data from EventSource
 * @param context - Context for error reporting (optional)
 * @returns Validated message or null if invalid
 */
export function parseAndValidateSSEMessage(
  rawData: string,
  context?: { kioskId?: number; timestamp?: string }
): SSEMessage | null {
  // Step 1: Type validation
  if (!rawData || typeof rawData !== 'string') {
    console.error('❌ Invalid SSE message: data is not a string', {
      type: typeof rawData,
      value: rawData,
      context,
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  // Step 2: Empty check
  const trimmedData = rawData.trim();
  if (trimmedData.length === 0) {
    console.warn('⚠️ Empty SSE message received, ignoring', { context });
    return null;
  }

  // Step 3: JSON parsing with detailed error context
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmedData);
  } catch (parseError) {
    const errorDetails = parseError instanceof Error
      ? {
          message: parseError.message,
          name: parseError.name,
        }
      : { error: String(parseError) };

    // Truncate data for logging (prevent log flooding)
    const truncatedData = trimmedData.length > 200
      ? `${trimmedData.substring(0, 200)}... (truncated, length: ${trimmedData.length})`
      : trimmedData;

    console.error('❌ SSE JSON parse error', {
      error: errorDetails,
      dataPreview: truncatedData,
      dataLength: trimmedData.length,
      context,
      timestamp: new Date().toISOString(),
    });

    return null;
  }

  // Step 4: Schema validation with Zod
  const validationResult = SSEMessageSchema.safeParse(parsed);
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((err: any) => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    console.error('❌ SSE message schema validation failed', {
      errors,
      receivedData: parsed,
      context,
      timestamp: new Date().toISOString(),
    });

    return null;
  }

  // Step 5: Additional business logic validation
  const message = validationResult.data;
  
  // Validate timestamp if present
  if (message.timestamp) {
    const timestamp = new Date(message.timestamp);
    if (isNaN(timestamp.getTime())) {
      console.error('❌ SSE message has invalid timestamp', {
        timestamp: message.timestamp,
        context,
      });
      return null;
    }

    // Reject messages from far future (clock skew protection)
    const now = Date.now();
    const messageTime = timestamp.getTime();
    const MAX_FUTURE_OFFSET = 60000; // 1 minute
    if (messageTime > now + MAX_FUTURE_OFFSET) {
      console.error('❌ SSE message timestamp is too far in future (possible clock skew)', {
        messageTime: message.timestamp,
        serverTime: new Date(now).toISOString(),
        offset: messageTime - now,
        context,
      });
      return null;
    }
  }

  return message as SSEMessage;
}

