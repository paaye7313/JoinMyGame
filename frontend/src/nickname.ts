const STORAGE_KEY = "jmg_nickname";

export function generateTempNickname(): string {
  return `손님${Math.floor(1000 + Math.random() * 9000)}`;
}

export function loadNickname(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  const temp = generateTempNickname();
  localStorage.setItem(STORAGE_KEY, temp);
  return temp;
}

export function saveNickname(nickname: string): void {
  localStorage.setItem(STORAGE_KEY, nickname);
}
