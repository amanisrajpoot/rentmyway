'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFoodMenu, upsertFoodMenu } from '@/lib/actions/pg-food-menu';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Property, PgFoodMenu } from '@/types/database';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['breakfast', 'lunch', 'snack', 'dinner'];

export function FoodMenuClient({ properties, readOnly = false }: { properties: Property[], readOnly?: boolean }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [menus, setMenus] = useState<PgFoodMenu[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (selectedPropertyId) loadMenu(selectedPropertyId);
  }, [selectedPropertyId]);

  async function loadMenu(propId: string) {
    setLoading(true);
    const { data } = await getFoodMenu(propId);
    setMenus(data as any || []);
    setLoading(false);
  }

  async function handleEditMenu(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEditLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const result = await upsertFoodMenu({
      property_id: selectedPropertyId,
      day_of_week: Number(formData.get('day_of_week')),
      meal_type: formData.get('meal_type') as string,
      menu_items: formData.get('menu_items') as string,
    } as any);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Menu updated successfully');
      setIsEditDialogOpen(false);
      loadMenu(selectedPropertyId);
    }
    setEditLoading(false);
  }

  function getMenuFor(dayIdx: number, meal: string) {
    const dayMenu = menus.find(m => m.day_of_week === dayIdx && m.meal_type === meal);
    return dayMenu?.menu_items || '-';
  }

  if (properties.length === 0) return <div className="text-center py-10 text-muted-foreground">No PG properties found.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        {!readOnly ? (
          <Select value={selectedPropertyId} onValueChange={(val: any) => setSelectedPropertyId(val)}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select Property">
                {properties.find(p => p.id === selectedPropertyId)?.title || "Select Property"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <h2 className="text-xl font-semibold">{properties[0]?.title}</h2>
        )}
        {!readOnly && (
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>Edit Menu</Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 stagger-children">
          {DAYS.map((day, idx) => (
            <Card key={day} className="border-border/50 hover:shadow-md transition-shadow">
              <CardHeader className="p-3 sm:p-4 bg-gradient-to-b from-muted/50 to-transparent border-b">
                <CardTitle className="text-sm font-semibold text-center">{day}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {MEALS.map(meal => (
                  <div key={meal} className="p-3 border-b last:border-0 text-sm hover:bg-muted/30 transition-colors">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-1.5">{meal}</p>
                    <p className="min-h-[40px] text-sm text-foreground/90">{getMenuFor(idx, meal)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Food Menu</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditMenu} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select name="day_of_week" defaultValue="0">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Meal Type</Label>
                <Select name="meal_type" defaultValue="breakfast">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEALS.map((meal) => (
                      <SelectItem key={meal} value={meal} className="capitalize">{meal}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Menu Items</Label>
              <Input name="menu_items" placeholder="e.g. Poha, Tea, Fruits" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Menu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
