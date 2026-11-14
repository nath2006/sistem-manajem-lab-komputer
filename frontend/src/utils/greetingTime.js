export const getGreetingTime = (m) => {
  let g = null;

  if (!m || !m.isValid()) {
    return;
  }

  let split_afternoon = 12;
  let split_evening = 18;
  let split_night = 3;
  let currentHour = parseFloat(m.format("HH"));

  if (currentHour >= split_afternoon && currentHour < split_evening) {
    g = "siang";
  } else if (currentHour >= split_evening || currentHour < split_night) {
    g = "malam";
  } else {
    g = "pagi";
  }

  return g;
}
