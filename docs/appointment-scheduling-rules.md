# Appointment Scheduling Rules and QA Scenarios

## Scheduling rules

- Each appointment occupies a 30-minute interval.
- Appointment dates and times are interpreted in Philippine Time (UTC+08:00), independent of the application server timezone.
- Customers can book at least three calendar days ahead, from 9:00 AM through 4:00 PM in half-hour increments.
- A customer cannot have overlapping active appointments, even when they are for different properties.
- The same property and customer cannot have duplicate active requests for the same start time.
- A property's assigned agent is attached to new appointment requests. Assigning an agent through the admin inquiry panel also updates the linked active appointment. One agent cannot have overlapping active appointments across properties.
- Different customers with different agents may book different properties at the same time.
- A customer can reschedule an active appointment only while no agent is assigned to the appointment or property. Rescheduling updates the existing appointment and its inquiry instead of creating another lead.
- Requested and confirmed appointments block time. Cancelled, completed, and no-show appointments do not.
- The booking page pre-checks the assigned agent's schedule. The API checks customer and agent overlaps again at submission; the database trigger is the final guard against concurrent requests and administrative writes.

## Scenarios to review

| Scenario | Expected behavior |
|---|---|
| Same customer submits the same property and time twice | Reject the duplicate; retain one active appointment. |
| Same customer selects an overlapping time for another property | Reject; the customer cannot attend both viewings. |
| Same agent is assigned to two properties with overlapping appointments | Reject the second assignment or booking. |
| Agent is assigned from the inquiry dashboard after appointment requests already exist | Link the agent to the appointment and reject the assignment if the agent is busy. |
| Same agent has appointments exactly 30 minutes apart | Allow; the time ranges do not overlap. |
| Different agents have separate property viewings at the same time | Allow. |
| Customer changes only the date or only the time | Reschedule the existing appointment if it is still unassigned. |
| Customer tries to reschedule after an agent is assigned | Reject and ask the customer to contact the agent. |
| An appointment is cancelled | Release its time for future booking. |
| Two requests arrive at almost the same moment | The database trigger serializes checks and rejects the conflicting write. |
| Client submits a past date, less than three days ahead, an off-hours time, or a non-half-hour time | Reject server-side even if the client is bypassed. |
| Application server runs outside Philippine Time | Store and compare the correct Philippine appointment instant. |
| Property has an assigned agent when the customer books | Inherit that agent and check their schedule. |

## Deployment and data checks

The application changes alone do not install database triggers. Apply `supabase/production-safety-fixes.sql` to staging, review existing conflicts with `supabase/appointment-conflict-audit.sql`, resolve them, and then promote the migration. The migration intentionally stops if it finds existing overlapping active appointments; it does not silently cancel or delete bookings.

Customer rescheduling currently matches the submitted name and email because customer accounts are not used. Those fields identify a booking but do not prove email ownership. A verified email link or one-time code would be needed to prevent someone who knows both values from changing another person's unassigned booking.
