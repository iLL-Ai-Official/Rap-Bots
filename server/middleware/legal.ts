/**
 * Legal Compliance Middleware
 * 
 * Middleware functions to enforce age verification, ToS acceptance,
 * and jurisdiction restrictions for wager battles and prize tournaments
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { 
  CURRENT_TOS_VERSION, 
  isJurisdictionRestricted, 
  isUserOfLegalAge,
  getAgeRequirement 
} from '../config/legal';

/**
 * Require age verification for wager battles
 * Blocks unverified users and minors
 */
export async function requireAgeVerification(
  req: Request & { user?: any }, 
  res: Response, 
  next: NextFunction
) {
  try {
    if (!req.user || !req.user.claims || !req.user.claims.sub) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is flagged as a minor
    if (user.isMinor) {
      return res.status(403).json({
        error: 'Users under 18 cannot participate in wager battles',
        code: 'MINOR_BLOCKED',
        ageRequired: getAgeRequirement(user.preferredJurisdiction)
      });
    }

    // Check age verification status
    if (user.ageVerificationStatus !== 'verified') {
      return res.status(403).json({
        error: 'Age verification required to participate in wager battles',
        code: 'AGE_VERIFICATION_REQUIRED',
        status: user.ageVerificationStatus || 'unverified',
        ageRequired: getAgeRequirement(user.preferredJurisdiction)
      });
    }

    // Double-check birthdate if available
    if (user.birthDate) {
      const isLegalAge = isUserOfLegalAge(new Date(user.birthDate), user.preferredJurisdiction);
      if (!isLegalAge) {
        // Update user to minor status
        await storage.updateUser(userId, { isMinor: true });
        
        return res.status(403).json({
          error: 'You must be of legal age to participate in wager battles',
          code: 'UNDERAGE',
          ageRequired: getAgeRequirement(user.preferredJurisdiction)
        });
      }
    }

    // User is verified and of legal age
    next();
  } catch (error: any) {
    console.error('❌ Age verification middleware error:', error);
    res.status(500).json({ 
      error: 'Age verification check failed',
      code: 'VERIFICATION_ERROR'
    });
  }
}

/**
 * Require Terms of Service acceptance
 * Checks if user accepted the current ToS version
 */
export async function requireToSAcceptance(
  req: Request & { user?: any }, 
  res: Response, 
  next: NextFunction
) {
  try {
    if (!req.user || !req.user.claims || !req.user.claims.sub) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user accepted current ToS version
    if (!user.tosAcceptedAt || user.tosVersion !== CURRENT_TOS_VERSION) {
      return res.status(403).json({
        error: 'You must accept the current Terms of Service',
        code: 'TOS_ACCEPTANCE_REQUIRED',
        currentVersion: CURRENT_TOS_VERSION,
        userVersion: user.tosVersion || 'none'
      });
    }

    // ToS accepted
    next();
  } catch (error: any) {
    console.error('❌ ToS acceptance middleware error:', error);
    res.status(500).json({ 
      error: 'ToS acceptance check failed',
      code: 'TOS_CHECK_ERROR'
    });
  }
}

/**
 * Check jurisdiction restrictions
 * Blocks users in restricted states/countries
 */
export async function checkJurisdiction(
  req: Request & { user?: any }, 
  res: Response, 
  next: NextFunction
) {
  try {
    if (!req.user || !req.user.claims || !req.user.claims.sub) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user's jurisdiction is restricted
    if (isJurisdictionRestricted(user.preferredJurisdiction)) {
      return res.status(403).json({
        error: 'Wager battles are not available in your jurisdiction',
        code: 'JURISDICTION_RESTRICTED',
        jurisdiction: user.preferredJurisdiction
      });
    }

    // Jurisdiction allowed
    next();
  } catch (error: any) {
    console.error('❌ Jurisdiction check middleware error:', error);
    res.status(500).json({ 
      error: 'Jurisdiction check failed',
      code: 'JURISDICTION_CHECK_ERROR'
    });
  }
}

/**
 * Combined legal compliance middleware
 * Checks age, ToS, and jurisdiction in one middleware
 * Use this for wager/prize endpoints to reduce overhead
 */
export async function requireLegalCompliance(
  req: Request & { user?: any }, 
  res: Response, 
  next: NextFunction
) {
  // Chain all checks
  requireAgeVerification(req, res, (err) => {
    if (err) return next(err);
    
    requireToSAcceptance(req, res, (err) => {
      if (err) return next(err);
      
      checkJurisdiction(req, res, next);
    });
  });
}
