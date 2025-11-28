import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/claims';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message = error.response?.data 
      ? (error.response.data as { error?: string }).error || 'An error occurred'
      : error.message || 'Network error';
    console.error(`[API Error] ${message}`);
    return Promise.reject(new Error(message));
  }
);

export interface Evidence {
  source: string;
  url?: string;
  snippet?: string;
  excerpt?: string;
  date?: string | null;
}

export interface Claim {
  id: string;
  text: string;
  status: 'pending' | 'verified' | 'debunked' | 'uncertain' | 'in_progress' | 'confirmed' | 'contradicted' | 'unconfirmed';
  confidence?: number;
  priority?: number;
  extracted?: {
    entities?: string[];
    location?: string | null;
    numbers?: string[];
    locations?: string[];
    crisis_types?: string[];
    recency?: {
      status?: string;
      isCurrentEvent?: boolean;
      isOldNews?: boolean;
      daysSinceLatestEvidence?: number;
      latestEvidenceDate?: string;
      warning?: string;
    };
  };
  evidence?: Evidence[];
  media?: string[];
  created_at: string;
  explanation?: {
    en?: string;
    hi?: string;
    mr?: string;
  };
  explanations?: {
    en?: string;
    hi?: string;
    mr?: string;
  };
  original_source?: {
    platform?: string;
    url?: string;
    post_id?: string;
    author?: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ClaimsListResponse {
  claims: Claim[];
  total?: number;
  page?: number;
  limit?: number;
}

export const submitClaim = async (text: string, media: string[] = []): Promise<{ claim: Claim }> => {
  const response = await api.post('/ingest', { 
    text, 
    media,
    original_source: { 
      platform: 'web', 
      url: typeof window !== 'undefined' ? window.location.href : '' 
    } 
  });
  return response.data;
};

export const getClaims = async (params?: { 
  limit?: number; 
  offset?: number;
  status?: string;
  search?: string;
}): Promise<Claim[]> => {
  const response = await api.get('/', { params });
  return response.data.claims;
};

export const getClaim = async (id: string): Promise<Claim> => {
  const response = await api.get(`/${id}`);
  return response.data.claim;
};

export const searchClaims = async (query: string): Promise<Claim[]> => {
  const response = await api.get('/search', { params: { q: query } });
  return response.data.claims;
};
