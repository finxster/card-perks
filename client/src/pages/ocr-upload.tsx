import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Upload, Image, CheckCircle, X, CreditCard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Card as CardType } from '@shared/schema';

interface UploadResult {
  filename: string;
  imageUrl?: string;
  perks: any[];
  confidence?: number;
  extractedText?: string;
  cardType?: string;
  error?: string;
}

// Map card issuer to OCR card type for parsing
function mapIssuerToCardType(issuer: string | null | undefined): string {
  if (!issuer) return 'unknown';
  
  const issuerLower = issuer.toLowerCase();
  if (issuerLower.includes('chase')) return 'chase';
  if (issuerLower.includes('american express') || issuerLower.includes('amex')) return 'amex';
  if (issuerLower.includes('citi')) return 'citi';
  if (issuerLower.includes('capital one')) return 'capital_one';
  if (issuerLower.includes('discover')) return 'discover';
  if (issuerLower.includes('wells fargo')) return 'wells_fargo';
  if (issuerLower.includes('bank of america')) return 'bank_of_america';
  
  return 'unknown';
}

export default function OCRUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch user's cards
  const { data: cards = [], isLoading: cardsLoading } = useQuery<CardType[]>({
    queryKey: ['/api/cards'],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Filter only image files
    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== selectedFiles.length) {
      toast({
        title: "Invalid files",
        description: "Only image files are allowed",
        variant: "destructive",
      });
    }
    
    // Limit to 5 files
    if (imageFiles.length > 5) {
      toast({
        title: "Too many files",
        description: "Maximum 5 images allowed per upload",
        variant: "destructive",
      });
      return;
    }
    
    setFiles(imageFiles);
    setResults([]);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
  };

  const handleUpload = async () => {
    if (!selectedCardId) {
      toast({
        title: "Card selection required",
        description: "Please select which credit card you're uploading offers for",
        variant: "destructive",
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one image to upload",
        variant: "destructive",
      });
      return;
    }

    const selectedCard = cards.find(card => card.id === selectedCardId);
    if (!selectedCard) {
      toast({
        title: "Invalid card selection",
        description: "Selected card not found",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });
      
      // Add card ID and derive card type from issuer
      formData.append('cardId', selectedCardId);
      const cardType = mapIssuerToCardType(selectedCard.issuer);
      formData.append('cardType', cardType);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/ocr/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setResults(data.results);
      
      if (data.totalPerksFound > 0) {
        toast({
          title: "Upload successful!",
          description: `Found ${data.totalPerksFound} potential perks. Redirecting to review...`,
        });
        
        // Navigate to confirmation page after a short delay
        setTimeout(() => {
          setLocation('/ocr/confirm');
        }, 2000);
      } else {
        toast({
          title: "No perks found",
          description: "We couldn't detect any credit card offers in the uploaded images. Please try different images.",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Credit Card Offers</h1>
        <p className="text-muted-foreground">
          Upload screenshots of your credit card offers (Chase Offers, Amex Offers, etc.) 
          and we'll automatically extract the perks for you to review and save.
        </p>
      </div>

      {/* Card Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Select Your Credit Card
          </CardTitle>
          <CardDescription>
            Choose which of your credit cards you're uploading offers for. This will automatically use the right parsing strategy and pre-fill the confirmation page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="cardSelect">Your Credit Cards</Label>
            {cardsLoading ? (
              <div className="text-sm text-muted-foreground">Loading your cards...</div>
            ) : cards.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No cards found. Please add a credit card first in your dashboard.
              </div>
            ) : (
              <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select one of your credit cards..." />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name} {card.lastFourDigits ? `(****${card.lastFourDigits})` : ''} - {card.issuer || 'Unknown Issuer'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!selectedCardId && cards.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Select your card to enable image upload
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Images
          </CardTitle>
          <CardDescription>
            Select up to 5 images of your credit card offers. Supported formats: JPG, PNG, GIF, WebP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="images">Select Images</Label>
            <Input
              id="images"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading || !selectedCardId || cards.length === 0}
              className="mt-1"
            />
            {!selectedCardId && cards.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Please select a card first
              </p>
            )}
            {cards.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Add a credit card to your account first
              </p>
            )}
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({files.length}/5)</Label>
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={files.length === 0 || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing Images...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload and Process
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
            <CardDescription>
              Here's what we found in your uploaded images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Image className="h-4 w-4" />
                  <span className="font-medium">{result.filename}</span>
                  {result.error ? (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Error</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">{result.perks.length} perks found</span>
                    </div>
                  )}
                </div>

                {result.error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{result.error}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {result.perks.map((perk, perkIndex) => (
                      <div key={perkIndex} className="bg-muted p-3 rounded">
                        <p className="font-medium">{perk.merchant}</p>
                        <p className="text-sm text-muted-foreground">{perk.description}</p>
                        {perk.value && (
                          <p className="text-sm font-medium text-green-600">{perk.value}</p>
                        )}
                        {perk.expiration && (
                          <p className="text-xs text-muted-foreground">Expires: {perk.expiration}</p>
                        )}
                      </div>
                    ))}
                    {result.confidence && (
                      <p className="text-xs text-muted-foreground">
                        Confidence: {Math.round(result.confidence)}%
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-8 space-y-4 text-sm text-muted-foreground">
        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-2">Tips for better results:</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>Take clear, well-lit photos of your credit card offers</li>
            <li>Ensure text is readable and not blurry</li>
            <li>Include the full offer details in the screenshot</li>
            <li>Avoid tilted or rotated images</li>
            <li>Screenshots from banking apps usually work better than photos of physical cards</li>
          </ul>
        </div>
      </div>
    </div>
  );
}