const ROOM_COLOR_PALETTE = ['#0E6B56', '#1E4D78', '#C97A2B', '#5C3E79', '#2C5B39', '#9C2F2F'] as const;

export function getRoomInitials(name: string): string {
  const tokens = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) {
    return 'R';
  }
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }
  return `${tokens[0][0] ?? ''}${tokens[1][0] ?? ''}`.toUpperCase();
}

export function getRoomIdentityColor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(index);
    hash |= 0;
  }
  const paletteIndex = Math.abs(hash) % ROOM_COLOR_PALETTE.length;
  return ROOM_COLOR_PALETTE[paletteIndex];
}
