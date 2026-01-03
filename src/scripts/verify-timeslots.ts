
import { generateWeekTimeSlots } from '../utils/eventViewUtils';

const slots = generateWeekTimeSlots(5, 23);
console.log("Generated Slots:", slots.length);
slots.forEach(s => console.log(`${s.hour}: ${s.time24} -> ${s.time12}`));

const endHour = 23;
const labelHour = endHour + 1;
// New Logic from TimeSlotGrid.tsx
const period = (labelHour) % 24 >= 12 ? 'PM' : 'AM';
const displayHour = labelHour > 12 ? ((labelHour) % 12 || 12) : labelHour;

console.log(`End Label Logic (24): ${displayHour}:00 ${period}`);
