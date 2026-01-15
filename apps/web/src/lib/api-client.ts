/**
 * API Client instance for web app
 */

import { createApiClient, ApiClient } from '@car-service/shared';
import { config } from './config';

export const apiClient: ApiClient = createApiClient(config.apiUrl);
