export function ageFromDob(dateOfBirth: string, on: Date = new Date()): number {
  const dob = new Date(dateOfBirth);
  let age = on.getFullYear() - dob.getFullYear();
  const hadBirthday =
    on.getMonth() > dob.getMonth() ||
    (on.getMonth() === dob.getMonth() && on.getDate() >= dob.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}
