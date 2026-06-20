'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, StarHalf, Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { addPropertyRating, getPropertyRatings } from '@/lib/actions/ratings';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PropertyRatingCardProps {
  propertyId: string;
}

export function PropertyRatingCard({ propertyId }: PropertyRatingCardProps) {
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [catClean, setCatClean] = useState(5);
  const [catMaint, setCatMaint] = useState(5);

  useEffect(() => {
    async function load() {
      try {
        const res = await getPropertyRatings(propertyId);
        if (res.data) setRatings(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [propertyId]);

  async function handleAddRating(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await addPropertyRating({
        property_id: propertyId,
        rating: ratingVal,
        review_text: reviewText,
        categories: {
          cleanliness: catClean,
          maintenance: catMaint,
        }
      });
      if (res.error) throw new Error(res.error);
      
      toast.success('Internal rating added');
      setRatings([res.data, ...ratings]);
      setDialogOpen(false);
      setReviewText('');
      setRatingVal(5);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add rating');
    } finally {
      setSaving(false);
    }
  }

  const avgRating = ratings.length > 0 
    ? (ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1)
    : '0.0';

  const renderStars = (val: number, size = 4) => {
    const full = Math.floor(val);
    const hasHalf = val - full >= 0.5;
    const arr = [];
    for (let i = 0; i < full; i++) arr.push(<Star key={`f-${i}`} className={`h-${size} w-${size} fill-amber-400 text-amber-400`} />);
    if (hasHalf) arr.push(<StarHalf key="h" className={`h-${size} w-${size} fill-amber-400 text-amber-400`} />);
    const rem = 5 - full - (hasHalf ? 1 : 0);
    for (let i = 0; i < rem; i++) arr.push(<Star key={`e-${i}`} className={`h-${size} w-${size} text-muted-foreground/30`} />);
    return arr;
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            Internal Rating
            {ratings.length > 0 && (
              <span className="bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                {avgRating} <Star className="h-3 w-3 fill-amber-500" />
              </span>
            )}
          </CardTitle>
          <CardDescription>Only visible to brokers & staff</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button variant="outline" size="sm" className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Internal Assessment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddRating} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Overall Rating (1-5)</Label>
                <Input type="number" min="1" max="5" required value={ratingVal} onChange={(e) => setRatingVal(Number(e.target.value))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cleanliness (1-5)</Label>
                  <Input type="number" min="1" max="5" value={catClean} onChange={(e) => setCatClean(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Maintenance (1-5)</Label>
                  <Input type="number" min="1" max="5" value={catMaint} onChange={(e) => setCatMaint(Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes / Review</Label>
                <Textarea placeholder="Internal notes about the property condition..." value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Assessment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>
        ) : ratings.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-md">
            No internal ratings yet.
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {ratings.map(r => (
              <div key={r.id} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex gap-0.5">{renderStars(r.rating, 3)}</div>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(r.created_at || new Date()), 'dd MMM yyyy')}
                  </span>
                </div>
                {r.review_text && <p className="text-sm text-muted-foreground mt-1.5">{r.review_text}</p>}
                {r.categories && Object.keys(r.categories).length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {Object.entries(r.categories).map(([k, v]) => (
                      <span key={k} className="text-[10px] bg-muted px-1.5 py-0.5 rounded capitalize text-muted-foreground">
                        {k}: {v as number}/5
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
