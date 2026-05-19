'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, 
  AlertTriangle, ExternalLink, CalendarClock, MessageSquare
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { PhoneLink } from '@/components/ui/phone-link';

interface SiteVisit {
  id: string;
  lead_id: string;
  type: string;
  notes: string | null;
  follow_up_date: string | null;
  completed: boolean;
  created_at: string;
  lead?: {
    name: string;
    phone: string;
    email: string | null;
    preferred_locality: string | null;
    preferred_city: string | null;
  } | null;
}

interface CalendarWorkspaceProps {
  initialVisits: SiteVisit[];
}

export function CalendarWorkspace({ initialVisits }: CalendarWorkspaceProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Conflict detection: group visits by exact follow_up_date
  const visitCountsByDate: Record<string, number> = {};
  initialVisits.forEach((visit) => {
    if (visit.follow_up_date) {
      visitCountsByDate[visit.follow_up_date] = (visitCountsByDate[visit.follow_up_date] || 0) + 1;
    }
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const activeVisits = initialVisits.filter(
    (v) => v.follow_up_date === selectedDateStr
  );

  const hasConflictOnDate = (dateStr: string) => {
    return (visitCountsByDate[dateStr] || 0) > 1;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-children">
      {/* Monthly Calendar View */}
      <Card className="lg:col-span-2 border-border/50 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Site Visit Calendar</CardTitle>
              <p className="text-xs text-muted-foreground">Monitor schedules & avoid double-booking conflicts</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[100px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground mb-4">
            <div>Su</div>
            <div>Mo</div>
            <div>Tu</div>
            <div>We</div>
            <div>Th</div>
            <div>Fr</div>
            <div>Sa</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {/* Empty padding days for alignment */}
            {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square" />
            ))}
            {daysInMonth.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayVisits = initialVisits.filter((v) => v.follow_up_date === dateStr);
              const isSelected = isSameDay(day, selectedDate);
              const hasVisits = dayVisits.length > 0;
              const hasConflict = hasConflictOnDate(dateStr);

              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border group ${
                    isSelected 
                      ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/25'
                      : hasConflict
                        ? 'border-amber-500/35 bg-amber-500/5 hover:bg-amber-500/10 text-foreground'
                        : hasVisits
                          ? 'border-primary/20 bg-primary/5 hover:bg-primary/10 text-foreground'
                          : 'border-transparent hover:bg-muted/40 text-foreground/80'
                  }`}
                >
                  <span className="text-sm font-semibold">{day.getDate()}</span>
                  
                  {/* Indicators */}
                  {hasVisits && !isSelected && (
                    <span className={`absolute bottom-2.5 h-1.5 w-1.5 rounded-full ${
                      hasConflict ? 'bg-amber-500 animate-pulse' : 'bg-primary'
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Agenda Side-Panel */}
      <div className="space-y-6">
        <Card className="border-border/50">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Agenda: {format(selectedDate, 'dd MMM yyyy')}</span>
              {activeVisits.length > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/25 text-xs">
                  {activeVisits.length} Visit{activeVisits.length > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {activeVisits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <CalendarClock className="h-8 w-8 mx-auto opacity-30" />
                <p className="text-sm font-medium">No site visits scheduled</p>
                <p className="text-xs">Select another day or record follow-ups for leads in pipeline.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Conflict Warning Alert */}
                {activeVisits.length > 1 && (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3.5 flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <p className="font-semibold text-xs text-amber-200">⚠️ Schedule Conflict Detected</p>
                      <p className="text-[10px] text-amber-200/70 mt-0.5 leading-relaxed">
                        You have scheduled {activeVisits.length} site visits on this date. Review details to prevent double-booking.
                      </p>
                    </div>
                  </div>
                )}

                {activeVisits.map((visit) => {
                  const leadName = visit.lead?.name || 'Inquiry Client';
                  const leadPhone = visit.lead?.phone || '';
                  const locality = visit.lead?.preferred_locality || '';
                  const city = visit.lead?.preferred_city || '';

                  // Coordinate message for WhatsApp Web / Deep link
                  const coordinateMessage = `Hi ${leadName}, this is regarding our scheduled property site visit to ${locality || 'the property'} on ${format(selectedDate, 'dd MMM yyyy')}. Just wanted to check if we are still on track?`;
                  const waLink = `https://wa.me/${leadPhone.replace(/\D/g, '')}?text=${encodeURIComponent(coordinateMessage)}`;
                  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${locality} ${city}`)}`;

                  return (
                    <Card key={visit.id} className="border-border/40 hover:border-primary/30 transition-all stagger-item">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-foreground">{leadName}</h4>
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                            Site Visit
                          </Badge>
                        </div>

                        {visit.notes && (
                          <p className="text-xs text-muted-foreground leading-relaxed italic bg-muted/30 p-2 rounded-lg border">
                            "{visit.notes}"
                          </p>
                        )}

                        <div className="space-y-1.5 pt-1 text-xs">
                          {locality && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span>{locality}{city ? `, ${city}` : ''}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-border/40">
                          {leadPhone && <PhoneLink phone={leadPhone} />}
                          
                          {leadPhone && (
                            <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                              <Button variant="outline" size="sm" className="w-full text-xs h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5" />
                                WhatsApp
                              </Button>
                            </a>
                          )}

                          {locality && (
                            <a href={mapsLink} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Locate on Maps">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
