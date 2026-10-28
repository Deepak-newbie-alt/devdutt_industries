import { CLOSURE_REASON_LABELS } from "../../api/staffInquiries";
import type { InquiryActivity, InquiryActivityType } from "../../types/api";
import { formatDateTime } from "../../utils/format";

const LABELS: Record<InquiryActivityType, string> = {
  CREATED: "Enquiry received",
  CLAIMED: "Claimed",
  CUSTOMER_CONTACTED: "Customer contacted",
  NOTE_ADDED: "Note",
  STATUS_CHANGED: "Status changed",
};

type ActivityTimelineProps = {
  activities: InquiryActivity[];
  currentEmployeeId: number;
};

export function ActivityTimeline({ activities, currentEmployeeId }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return <p className="muted">No activity yet.</p>;
  }

  return (
    <ol className="timeline">
      {activities.map((activity) => (
        <li key={activity.id} className={`timeline__item timeline__item--${activity.activityType.toLowerCase()}`}>
          <p className="timeline__heading">
            <span className="timeline__label">{LABELS[activity.activityType]}</span>
            <span className="timeline__meta">
              {formatDateTime(activity.createdAt)}
              {activity.salespersonId !== null &&
                (activity.salespersonId === currentEmployeeId ? " · by you" : ` · staff #${activity.salespersonId}`)}
            </span>
          </p>
          {activity.closureReason && <p className="timeline__note">Closed: {CLOSURE_REASON_LABELS[activity.closureReason]}</p>}
          {activity.note && <p className="timeline__note">{activity.note}</p>}
        </li>
      ))}
    </ol>
  );
}
