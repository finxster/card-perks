import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import multer from "multer";
import { insertUserSchema, insertCardSchema, insertPerkSchema, insertMerchantSchema, insertHouseholdSchema, insertCrowdsourcingSchema } from "@shared/schema";
import { OCRService } from "./ocr-service-v2";
import { createR2Service } from "./r2-service";

const JWT_SECRET = process.env.JWT_SECRET || "cardperks-secret-key-change-in-production";
const CLOUDFLARE_EMAIL_WORKER = "https://cardperks-email-proxy-dev.oieusouofinx.workers.dev";

// Create OCR service instance with enhanced parsers
const ocrService = new OCRService();

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
            headers: {
              'Content-Type': 'application/json',
              'x-worker-key': JWT_SECRET,
            },
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

      const emailSent = await sendEmail('verify', email, {
        name,
        token,
        verificationUrl: `${req.protocol}://${req.get('host')}/verify-email?token=${token}`,
      });

      if (!emailSent) {
        console.error(`Failed to send verification email to ${email} for user ${user.id}`);
        return res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
      }

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
      const perks = await storage.getUserAccessiblePerks(req.userId!);
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

  app.patch('/api/perks/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const perk = await storage.getPerk(req.params.id);
      if (!perk) {
        return res.status(404).json({ message: 'Perk not found' });
      }

      // Check if user can edit this perk
      let canEdit = perk.createdBy === req.userId;
      
      // If not the creator, check if user is household owner for household card perks
      if (!canEdit && perk.cardId) {
        const card = await storage.getCard(perk.cardId);
        if (card?.isHousehold) {
          const household = await storage.getUserHousehold(req.userId!);
          canEdit = household?.ownerId === req.userId;
        }
      }

      if (!canEdit) {
        return res.status(403).json({ message: 'Not authorized to edit this perk' });
      }

      const perkData = insertPerkSchema.partial().parse(req.body);
      const updated = await storage.updatePerk(req.params.id, perkData);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/perks/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const perk = await storage.getPerk(req.params.id);
      if (!perk) {
        return res.status(404).json({ message: 'Perk not found' });
      }

      // Check if user can delete this perk
      let canDelete = perk.createdBy === req.userId;
      
      // If not the creator, check if user is household owner for household card perks
      if (!canDelete && perk.cardId) {
        const card = await storage.getCard(perk.cardId);
        if (card?.isHousehold) {
          const household = await storage.getUserHousehold(req.userId!);
          canDelete = household?.ownerId === req.userId;
        }
      }

      if (!canDelete) {
        return res.status(403).json({ message: 'Not authorized to delete this perk' });
      }

      await storage.deletePerk(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

      // Fetch all merchants and filter by query (case-insensitive)
      const allMerchants = await storage.getAllMerchants();
      const lowerQuery = query.toLowerCase();
      const merchants = allMerchants.filter(m => m.name.toLowerCase().includes(lowerQuery));

      const results = await Promise.all(
        merchants.map(async (merchant) => {
          const merchantPerks = await storage.getMerchantPerks(merchant.id);
          const userCards = await storage.getUserCards(req.userId!);

          // Collect all matching cards and their associated perks
          const matchingCards = userCards
            .map(card => {
              const perksForCard = merchantPerks.filter(perk => perk.cardId === card.id);
              if (perksForCard.length > 0) {
                return {
                  card,
                  perks: perksForCard
                };
              }
              return null;
            })
            .filter(Boolean);

          return { ...merchant, matchingCards };
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

      const emailSent = await sendEmail('invite', email, {
        token,
        householdName: household.name,
        inviterName: req.user.name,
        inviteToken: `${token}`,
      });

      if (!emailSent) {
        console.error(`Failed to send household invite email to ${email} for household ${household.id}`);
        return res.status(500).json({ message: 'Failed to send invitation email. Please try again later.' });
      }

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

  // Remove household member
  app.delete('/api/household/members/:memberId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { memberId } = req.params;
      
      if (!memberId || typeof memberId !== 'string') {
        return res.status(400).json({ message: 'Invalid member ID' });
      }

      // Get user's household
      const household = await storage.getUserHousehold(req.userId!);
      if (!household) {
        return res.status(404).json({ message: 'You are not in a household' });
      }

      // Check if user is the owner
      if (household.ownerId !== req.userId) {
        return res.status(403).json({ message: 'Only the household owner can remove members' });
      }

      // Check if trying to remove self
      if (memberId === req.userId) {
        return res.status(400).json({ message: 'You cannot remove yourself. Delete the household instead.' });
      }

      // Remove the member
      const removed = await storage.removeHouseholdMember(household.id, memberId);
      
      if (!removed) {
        return res.status(404).json({ message: 'Member not found or could not be removed' });
      }

      res.json({ success: true, message: 'Member removed successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Delete household
  app.delete('/api/household', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      // Get user's household
      const household = await storage.getUserHousehold(req.userId!);
      if (!household) {
        return res.status(404).json({ message: 'You are not in a household' });
      }

      // Check if user is the owner
      if (household.ownerId !== req.userId) {
        return res.status(403).json({ message: 'Only the household owner can delete the household' });
      }

      // Delete the household (this will cascade delete members and related data)
      const deleted = await storage.deleteHousehold(household.id);
      
      if (!deleted) {
        return res.status(500).json({ message: 'Failed to delete household' });
      }

      res.json({ success: true, message: 'Household deleted successfully' });
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

  // Configure multer for image uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 5 // Maximum 5 files per request
    },
    fileFilter: (req, file, cb) => {
      // Only allow image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  // Initialize R2 service (only if environment variables are provided)
  let r2Service: any = null;
  try {
    r2Service = createR2Service();
  } catch (error) {
    console.warn('R2 service not configured:', error);
  }

  // OCR Routes
  app.post('/api/ocr/upload', authMiddleware, upload.array('images', 5), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No images uploaded' });
      }

      const files = req.files as Express.Multer.File[];
      const userId = req.userId!;
      const cardType = req.body.cardType;
      const cardId = req.body.cardId; // New: selected card ID
      const results = [];

      // Validate required parameters
      if (!cardType) {
        return res.status(400).json({ message: 'Card type is required' });
      }

      console.log(`Processing ${files.length} images for card type: ${cardType}, cardId: ${cardId || 'none'}`);

      // Clear any existing draft perks for this user
      await storage.deleteUserOcrDraftPerks(userId);

      for (const file of files) {
        try {
          // Process OCR on the image using card type for better accuracy
          const ocrResult = await ocrService.extractPerksFromImageWithCardType(file.buffer, cardType);
          
          // Upload image to R2 if service is available
          let imageUrl = '';
          let cloudflareKey = '';
          
          if (r2Service) {
            const { url, key } = await r2Service.uploadImage(file.buffer, file.mimetype, userId);
            imageUrl = url;
            cloudflareKey = key;
            
            // Store image record in database
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await storage.createOcrImage({
              userId,
              filename: file.originalname,
              url: imageUrl,
              cloudflareKey,
              processed: true,
              expiresAt
            });
          }

          // Store extracted perks as drafts
          for (const perk of ocrResult.perks) {
            await storage.createOcrDraftPerk({
              userId,
              cardId: cardId || null, // Associate with the selected card
              merchant: perk.merchant,
              description: perk.description,
              expiration: perk.expiration || null,
              value: perk.value || null,
              status: 'inactive',
              imageUrl,
              extractedText: ocrResult.text,
              confirmed: false
            });
          }

          results.push({
            filename: file.originalname,
            imageUrl,
            perks: ocrResult.perks,
            confidence: ocrResult.confidence,
            extractedText: ocrResult.text,
            cardType: cardType
          });

        } catch (error) {
          console.error(`Error processing ${file.originalname}:`, error);
          results.push({
            filename: file.originalname,
            error: 'Failed to process image',
            perks: []
          });
        }
      }

      res.json({
        success: true,
        results,
        totalPerksFound: results.reduce((sum, result) => sum + (result.perks?.length || 0), 0)
      });

    } catch (error: any) {
      console.error('OCR upload error:', error);
      res.status(500).json({ message: error.message || 'Failed to process images' });
    }
  });

  // Get draft perks for review
  app.get('/api/ocr/draft', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const draftPerks = await storage.getUserOcrDraftPerks(userId);
      res.json(draftPerks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update a draft perk
  app.patch('/api/ocr/draft/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { merchant, description, expiration, value, status } = req.body;
      
      // Validate that the perk belongs to the user
      const drafts = await storage.getUserOcrDraftPerks(req.userId!);
      const draftPerk = drafts.find(p => p.id === id);
      
      if (!draftPerk) {
        return res.status(404).json({ message: 'Draft perk not found' });
      }

      const updated = await storage.updateOcrDraftPerk(id, {
        merchant,
        description,
        expiration,
        value,
        status
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Confirm selected perks and save them permanently
  app.post('/api/ocr/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { perkIds, cardId } = req.body;
      
      if (!perkIds || !Array.isArray(perkIds) || perkIds.length === 0) {
        return res.status(400).json({ message: 'No perks selected for confirmation' });
      }

      if (!cardId) {
        return res.status(400).json({ message: 'Card ID is required for confirming perks' });
      }

      const userId = req.userId!;
      
      // Validate that the card belongs to the user
      const userCards = await storage.getUserCards(userId);
      const cardExists = userCards.some(card => card.id === cardId);
      
      if (!cardExists) {
        return res.status(400).json({ message: 'Invalid card ID or card does not belong to user' });
      }

      const draftPerks = await storage.getUserOcrDraftPerks(userId);
      const confirmedPerks = [];

      for (const perkId of perkIds) {
        const draftPerk = draftPerks.find(p => p.id === perkId);
        if (!draftPerk) continue;

        // Create or find merchant
        let merchant = await storage.searchMerchants(draftPerk.merchant);
        if (merchant.length === 0) {
          // Create new merchant
          merchant = [await storage.createMerchant({
            name: draftPerk.merchant,
            category: 'General', // Default category
            address: null
          })];
        }

        // Create permanent perk
        const perk = await storage.createPerk({
          name: draftPerk.merchant,
          description: draftPerk.description,
          merchantId: merchant[0].id,
          expirationDate: draftPerk.expiration ? new Date(draftPerk.expiration) : undefined,
          isPublic: false,
          createdBy: userId,
          cardId: cardId,
          value: draftPerk.value
        });

        confirmedPerks.push(perk);

        // Mark draft as confirmed
        await storage.updateOcrDraftPerk(perkId, { confirmed: true });
      }

      // Clean up confirmed draft perks
      for (const perkId of perkIds) {
        await storage.deleteOcrDraftPerk(perkId);
      }

      res.json({
        success: true,
        confirmedPerks,
        message: `Successfully confirmed ${confirmedPerks.length} perks`
      });

    } catch (error: any) {
      console.error('Confirm perks error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete draft perk
  app.delete('/api/ocr/draft/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      // Validate that the perk belongs to the user
      const drafts = await storage.getUserOcrDraftPerks(req.userId!);
      const draftPerk = drafts.find(p => p.id === id);
      
      if (!draftPerk) {
        return res.status(404).json({ message: 'Draft perk not found' });
      }

      await storage.deleteOcrDraftPerk(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cleanup expired images (can be called by cron job)
  app.post('/api/ocr/cleanup', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!r2Service) {
        return res.status(503).json({ message: 'R2 service not configured' });
      }

      const expiredImages = await storage.getExpiredOcrImages();
      const keys = expiredImages.map(img => img.cloudflareKey).filter(Boolean);
      
      if (keys.length === 0) {
        return res.json({ message: 'No expired images to clean up' });
      }

      const { success, failed } = await r2Service.deleteImages(keys);
      
      // Delete records from database for successfully deleted images
      for (const key of success) {
        const image = expiredImages.find(img => img.cloudflareKey === key);
        if (image) {
          await storage.deleteOcrImage(image.id);
        }
      }

      res.json({
        success: true,
        deleted: success.length,
        failed: failed.length,
        message: `Cleaned up ${success.length} expired images`
      });

    } catch (error: any) {
      console.error('Cleanup error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
