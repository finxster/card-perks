import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { insertUserSchema, insertCardSchema, insertPerkSchema, insertMerchantSchema, insertHouseholdSchema, insertCrowdsourcingSchema } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "cardperks-secret-key-change-in-production";
const CLOUDFLARE_EMAIL_WORKER = "https://cardperks-email-proxy-dev.oieusouofinx.workers.dev";

interface AuthRequest extends Request {
  userId?: string;
  user?: any;
}

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

async function sendEmail(type: string, to: string, data: any) {
  try {
    const response = await fetch(`${CLOUDFLARE_EMAIL_WORKER}/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, ...data }),
    });
    return response.ok;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication Routes
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }
      
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        name,
        email,
        passwordHash,
        role: 'user',
      } as any);

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await storage.createVerificationToken({
        token,
        userId: user.id,
        email: user.email,
        type: 'email_verification',
        metadata: null,
        expiresAt,
      });

      await sendEmail('verify', email, {
        name,
        verificationUrl: `${req.protocol}://${req.get('host')}/verify-email?token=${token}`,
      });

      res.json({ success: true, message: 'Registration successful. Please check your email.' });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (!user.verified) {
        return res.status(401).json({ message: 'Please verify your email first' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      const { passwordHash, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Login failed' });
    }
  });

  app.get('/api/auth/verify/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const verificationToken = await storage.getVerificationToken(token);

      if (!verificationToken) {
        return res.json({ success: false, message: 'Invalid verification link' });
      }

      if (new Date() > new Date(verificationToken.expiresAt)) {
        return res.json({ success: false, message: 'Verification link expired' });
      }

      if (verificationToken.userId) {
        await storage.updateUser(verificationToken.userId, { verified: true });
      }

      await storage.deleteVerificationToken(token);
      res.json({ success: true, message: 'Email verified successfully' });
    } catch (error: any) {
      res.json({ success: false, message: error.message || 'Verification failed' });
    }
  });

  app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    const { passwordHash, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // Cards Routes
  app.get('/api/cards', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const cards = await storage.getUserCards(req.userId!);
      const cardsWithPerkCount = await Promise.all(
        cards.map(async (card) => {
          const perks = await storage.getCardPerks(card.id);
          return { ...card, perkCount: perks.length };
        })
      );
      res.json(cardsWithPerkCount);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/cards', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const cardData = insertCardSchema.parse(req.body);
      const card = await storage.createCard({ ...cardData, ownerId: req.userId! });
      res.json(card);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/cards/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const card = await storage.getCard(req.params.id);
      if (!card || card.ownerId !== req.userId) {
        return res.status(404).json({ message: 'Card not found' });
      }
      const cardData = insertCardSchema.parse(req.body);
      const updated = await storage.updateCard(req.params.id, cardData);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/cards/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const card = await storage.getCard(req.params.id);
      if (!card || card.ownerId !== req.userId) {
        return res.status(404).json({ message: 'Card not found' });
      }
      await storage.deleteCard(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Perks Routes
  app.get('/api/perks', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const perks = await storage.getUserPerks(req.userId!);
      res.json(perks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/perks', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const perkData = insertPerkSchema.parse(req.body);
      const perk = await storage.createPerk({ ...perkData, createdBy: req.userId! });
      res.json(perk);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Merchants Routes
  app.get('/api/merchants', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const merchants = await storage.getAllMerchants();
      res.json(merchants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/merchants/search', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }

      const merchants = await storage.searchMerchants(query);
      
      const results = await Promise.all(
        merchants.map(async (merchant) => {
          const merchantPerks = await storage.getMerchantPerks(merchant.id);
          const userCards = await storage.getUserCards(req.userId!);
          
          let bestCard = null;
          let perkValue = null;
          
          for (const perk of merchantPerks) {
            const card = userCards.find(c => c.id === perk.cardId);
            if (card) {
              bestCard = card;
              perkValue = perk.value;
              break;
            }
          }
          
          return { ...merchant, bestCard, perkValue };
        })
      );
      
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Household Routes
  app.get('/api/household/my', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const household = await storage.getUserHousehold(req.userId!);
      res.json(household || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/household', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const existing = await storage.getUserHousehold(req.userId!);
      if (existing) {
        return res.status(400).json({ message: 'You are already in a household' });
      }

      const householdData = insertHouseholdSchema.parse(req.body);
      const household = await storage.createHousehold({ ...householdData, ownerId: req.userId! });
      res.json(household);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/household/members', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const household = await storage.getUserHousehold(req.userId!);
      if (!household) {
        return res.json([]);
      }

      const members = await storage.getHouseholdMembers(household.id);
      const membersWithOwner = members.map(m => ({
        ...m.user,
        isOwner: m.user.id === household.ownerId,
      }));
      
      res.json(membersWithOwner);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/household/invite', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { email } = req.body;
      const household = await storage.getHouseholdByOwnerId(req.userId!);
      
      if (!household) {
        return res.status(400).json({ message: 'You must create a household first' });
      }

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      await storage.createVerificationToken({
        token,
        userId: null,
        email,
        type: 'household_invite',
        metadata: { householdId: household.id, householdName: household.name },
        expiresAt,
      });

      await sendEmail('invite', email, {
        householdName: household.name,
        inviterName: req.user.name,
        inviteUrl: `${req.protocol}://${req.get('host')}/accept-invite?token=${token}`,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/household/accept/:token', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { token } = req.params;
      const inviteToken = await storage.getVerificationToken(token);

      if (!inviteToken || inviteToken.type !== 'household_invite') {
        return res.status(400).json({ message: 'Invalid invite link' });
      }

      if (new Date() > new Date(inviteToken.expiresAt)) {
        await storage.deleteVerificationToken(token);
        return res.status(400).json({ message: 'Invite link expired' });
      }

      // Critical security check: ensure authenticated user's email matches invite email
      if (!inviteToken.email || req.user.email.toLowerCase() !== inviteToken.email.toLowerCase()) {
        return res.status(403).json({ message: 'This invitation was sent to a different email address' });
      }

      const metadata = inviteToken.metadata as any;
      
      // Check if user is already in this household
      const existingHousehold = await storage.getUserHousehold(req.userId!);
      if (existingHousehold) {
        if (existingHousehold.id === metadata.householdId) {
          await storage.deleteVerificationToken(token);
          return res.json({ success: true, householdId: metadata.householdId, message: 'Already a member' });
        }
        return res.status(400).json({ message: 'You are already in another household. Leave it first to join a new one.' });
      }

      await storage.addHouseholdMember(metadata.householdId, req.userId!);
      await storage.deleteVerificationToken(token);

      res.json({ success: true, householdId: metadata.householdId });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Crowdsourcing Routes
  app.post('/api/crowdsourcing/merchant', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const data = insertCrowdsourcingSchema.parse(req.body);
      const submission = await storage.createCrowdsourcing({
        ...data,
        submittedBy: req.userId!,
        status: 'pending',
      });
      res.json(submission);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post('/api/crowdsourcing/perk', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const data = insertCrowdsourcingSchema.parse(req.body);
      const submission = await storage.createCrowdsourcing({
        ...data,
        submittedBy: req.userId!,
        status: 'pending',
      });
      res.json(submission);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin Routes
  app.get('/api/admin/crowdsourcing', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const submissions = await storage.getAllCrowdsourcing();
      const withSubmitterInfo = await Promise.all(
        submissions.map(async (s) => {
          const submitter = await storage.getUser(s.submittedBy);
          return { ...s, submitterEmail: submitter?.email };
        })
      );
      res.json(withSubmitterInfo);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch('/api/admin/crowdsourcing/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { status, note } = req.body;
      const submission = await storage.getCrowdsourcing(req.params.id);
      
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      if (status === 'approved' && submission.type === 'merchant') {
        await storage.createMerchant(submission.payload as any);
      }

      const updated = await storage.updateCrowdsourcing(req.params.id, {
        status,
        reviewNote: note,
        reviewedBy: req.userId,
        reviewedAt: new Date(),
      });

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/admin/merchants', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const merchants = await storage.getAllMerchants();
      res.json(merchants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/admin/merchants', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const merchantData = insertMerchantSchema.parse(req.body);
      const merchant = await storage.createMerchant(merchantData);
      res.json(merchant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/admin/merchants/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteMerchant(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
