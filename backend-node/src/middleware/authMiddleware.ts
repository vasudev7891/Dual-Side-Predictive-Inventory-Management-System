import { Response, NextFunction, Request } from 'express';
import { supabaseAdmin } from '../services/supabaseAdmin';
import { User } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  profile?: {
    id: string;
    role: 'supplier' | 'retailer';
    full_name: string | null;
    created_at: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token is required. Authorization: Bearer <Token>' });
    }

    // 1. Retrieve the user from Supabase Auth using the JWT
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    // 2. Fetch profile role from PostgreSQL profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'User profile does not exist. Please complete registration.' });
    }

    // 3. Inject user and profile into Request object
    req.user = user;
    req.profile = profile;

    return next();
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error during token authentication.', details: err.message });
  }
};

export const requireRole = (role: 'supplier' | 'retailer') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.profile || req.profile.role !== role) {
      return res.status(403).json({ 
        error: `Access Denied: Requiring '${role}' privileges. Current profile role is '${req.profile?.role || 'unknown'}'.` 
      });
    }
    return next();
  };
};
