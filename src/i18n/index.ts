import { ru } from './ru';
import { en } from './en';
import { useAppStore } from '../store/useAppStore';

export type Dict = typeof ru;

export function useT(): Dict {
  const locale = useAppStore((s) => s.locale);
  return locale === 'ru' ? ru : en;
}


