let pending: string | null = null;

export const setPendingInvite = (code: string) => {
  pending = code;
};

export const consumePendingInvite = (): string | null => {
  const c = pending;
  pending = null;
  return c;
};
