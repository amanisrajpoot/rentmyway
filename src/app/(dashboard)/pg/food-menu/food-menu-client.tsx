'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getFoodMenu } from '@/lib/actions/pg-food-menu';
import { Loader2 } from 'lucide-react';
import type { Property, PgFoodMenu } from '@/types/database';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['breakfast', 'lunch', 'snack', 'dinner'];

export function FoodMenuClient({ properties }: { properties: Property[] }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [menus, setMenus] = useState<PgFoodMenu[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPropertyId) loadMenu(selectedPropertyId);
  }, [selectedPropertyId]);

  async function loadMenu(propId: string) {
    setLoading(true);
    const { data } = await getFoodMenu(propId);
    setMenus(data as any || []);
    setLoading(false);
  }

  function getMenuFor(dayIdx: number, meal: string) {
    const dayMenu = menus.find(m => m.day_of_week === dayIdx && m.meal_type === meal);
    return dayMenu?.menu_items || '-';
  }

  if (properties.length === 0) return <div className="text-center py-10 text-muted-foreground">No PG properties found.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Select value={selectedPropertyId} onValueChange={(val: any) => setSelectedPropertyId(val)}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select Property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline">Edit Menu</Button>
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
    </div>
  );
}
