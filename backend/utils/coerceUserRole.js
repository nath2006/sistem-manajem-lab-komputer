import { Prisma, $Enums } from '@prisma/client';

const ENUM_OBJECT = ($Enums && $Enums.user_role) || (Prisma && Prisma.user_role);
const VALID_VALUES = Object.values(ENUM_OBJECT);
const VALID_SET = new Set(VALID_VALUES);
const VALID_LOWER = VALID_VALUES.map((v) => v.toLowerCase());

export default function coerceUserRole(role) {
  if (role == null) return undefined;

  const raw = String(role).trim();
  if (VALID_SET.has(raw)) return raw;

  const normalized = raw.toLowerCase().replace(/[^\w]+/g, '_').replace(/_+/g, '_');

  const idx = VALID_LOWER.indexOf(normalized);
  if (idx !== -1) return VALID_VALUES[idx];

  const err = new Error(`role tidak valid. Pilih salah satu: ${VALID_VALUES.join(', ')}`);
  err.status = 400;
  throw err;
}
