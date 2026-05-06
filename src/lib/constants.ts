export const DISTRICTS = [
  "Thiruvananthapuram",
  "Kollam",
  "Pathanamthitta",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Ernakulam",
  "Thrissur",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Wayanad",
  "Kannur",
  "Kasaragod",
] as const;

export const WATER_SOURCES = ["Borewell", "Open Well", "Tap Water", "River", "Tank", "Other"] as const;

export const STATUSES = ["Confirmed", "Ongoing", "Collected", "Received at Lab", "Result Ready", "Cancelled"] as const;

export const PAYMENT_MODES = ["Direct", "AV GPay", "Aquagrand", "Water Store", "Cash"] as const;

export const STATUS_BADGE: Record<(typeof STATUSES)[number], string> = {
  Confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  Ongoing: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  Collected: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  "Received at Lab": "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
  "Result Ready": "bg-green-100 text-green-800 hover:bg-green-100",
  Cancelled: "bg-rose-100 text-rose-800 hover:bg-rose-100",
};
