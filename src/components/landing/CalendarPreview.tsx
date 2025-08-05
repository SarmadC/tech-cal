'use client';

export function CalendarPreview() {
    return (
        <div className="calendar-preview slide-in-right">
            <div className="calendar-header">
                <div className="calendar-title">Upcoming Tech Events</div>
                <div className="calendar-live">
                    <div className="live-dot"></div>
                    Live Updates
                </div>
            </div>
            <div className="calendar-events">
                <div className="calendar-event">
                    <div className="event-date">May 14</div>
                    <div className="event-details">
                        <div className="event-title">Google I/O 2025</div>
                        <div className="event-company">Google</div>
                    </div>
                    <div className="event-status status-upcoming">Upcoming</div>
                </div>
                <div className="calendar-event">
                    <div className="event-date">May 21</div>
                    <div className="event-details">
                        <div className="event-title">Microsoft Build</div>
                        <div className="event-company">Microsoft</div>
                    </div>
                    <div className="event-status status-upcoming">Upcoming</div>
                </div>
                <div className="calendar-event">
                    <div className="event-date">Jun 10</div>
                    <div className="event-details">
                        <div className="event-title">WWDC 2025</div>
                        <div className="event-company">Apple</div>
                    </div>
                    <div className="event-status status-upcoming">Upcoming</div>
                </div>
                <div className="calendar-event">
                    <div className="event-date">NOW</div>
                    <div className="event-details">
                        <div className="event-title">DevOps Days</div>
                        <div className="event-company">DevOps Community</div>
                    </div>
                    <div className="event-status status-live">Live</div>
                </div>
            </div>
        </div>
    );
}