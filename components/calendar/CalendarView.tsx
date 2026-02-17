'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, MapPin, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Activity } from '@/types';
import CreateEventModal from './CreateEventModal';

interface CalendarViewProps {
  accountId: string;
  userId: string;
}

export default function CalendarView({ accountId, userId }: CalendarViewProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [accountId, currentDate]);

  // Real-time subscription for activity changes
  useEffect(() => {
    const channel = supabase
      .channel('calendar-activities')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities',
          filter: `account_id=eq.${accountId}`
        },
        () => {
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId, currentDate]);

  const loadActivities = async () => {
    setLoading(true);

    // Get activities for current month
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('account_id', accountId)
      .eq('type', 'meeting')
      .gte('due_date', startOfMonth.toISOString())
      .lte('due_date', endOfMonth.toISOString())
      .order('due_date', { ascending: true });

    if (data) {
      setActivities(data);
    }

    setLoading(false);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getActivitiesForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return activities.filter(activity => {
      if (!activity.due_date) return false;
      const activityDate = new Date(activity.due_date);
      return activityDate.getDate() === day &&
             activityDate.getMonth() === date.getMonth() &&
             activityDate.getFullYear() === date.getFullYear();
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() &&
                         today.getFullYear() === currentDate.getFullYear();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>
          <p className="text-gray-600 mt-1">View and manage your meetings</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Event
        </button>
      </div>

      {/* Calendar Controls */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold min-w-[200px] text-center">{monthName}</h3>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="ml-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex gap-2">
            {['month', 'week', 'day'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v as any)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  view === v
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center">
          <div className="text-gray-500">Loading calendar...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <div className="card p-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayActivities = getActivitiesForDay(day);
                  const isToday = isCurrentMonth && today.getDate() === day;
                  const isSelected = selectedDay === day;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`aspect-square border rounded-lg p-2 hover:bg-gray-50 cursor-pointer transition-colors ${
                        isToday
                          ? 'border-primary-500 bg-primary-50'
                          : isSelected
                          ? 'border-primary-300 bg-primary-25'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className={`text-sm font-medium ${
                        isToday ? 'text-primary-600' : 'text-gray-900'
                      }`}>
                        {day}
                      </div>
                      <div className="mt-1 space-y-1">
                        {dayActivities.slice(0, 2).map(activity => (
                          <div
                            key={activity.id}
                            className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded truncate"
                            title={activity.subject}
                          >
                            {activity.subject || 'Meeting'}
                          </div>
                        ))}
                        {dayActivities.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{dayActivities.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Event Details Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedDay
                  ? `Events - ${currentDate.toLocaleString('default', { month: 'short' })} ${selectedDay}`
                  : 'Select a day'
                }
              </h3>

              {selectedDay ? (
                <div className="space-y-3">
                  {getActivitiesForDay(selectedDay).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No events on this day</p>
                    </div>
                  ) : (
                    getActivitiesForDay(selectedDay).map(activity => (
                      <div
                        key={activity.id}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="font-medium text-gray-900 mb-1">
                          {activity.subject || 'Meeting'}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Clock className="w-4 h-4" />
                          {formatTime(activity.due_date!)}
                        </div>

                        {activity.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {activity.description}
                          </p>
                        )}

                        <div className={`mt-2 inline-flex items-center px-2 py-1 rounded text-xs ${
                          activity.completed
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {activity.completed ? 'Completed' : 'Pending'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Click on a day to view events</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-600">Total Meetings</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {activities.length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {activities.filter(a => a.completed).length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">
            {activities.filter(a => !a.completed).length}
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          accountId={accountId}
          userId={userId}
          onClose={() => setShowCreateModal(false)}
          onEventCreated={loadActivities}
        />
      )}
    </div>
  );
}
