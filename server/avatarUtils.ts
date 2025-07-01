// Lista de emojis de smile para avatares
const SMILE_EMOJIS = [
  "😊", "😁", "😃", "😄", "😆", "😅", "🤣", "😂", "🙂", "🙃",
  "😉", "😇", "🥰", "😍", "🤩", "😋", "😜", "🤪", "😎", "🤓",
  "🥳", "😊", "😌", "😚", "😙", "😗", "😘", "🥲", "😋", "😛",
  "🤗", "🤭", "🤫", "🤔", "🤨", "😐", "😑", "😶", "🙄", "😏",
  "😣", "😥", "😮", "🤐", "😯", "😪", "😫", "🥱", "😴", "😌"
];

export function generateRandomAvatar(): string {
  const randomIndex = Math.floor(Math.random() * SMILE_EMOJIS.length);
  return SMILE_EMOJIS[randomIndex];
}

export function isValidEmoji(emoji: string): boolean {
  return SMILE_EMOJIS.includes(emoji);
}