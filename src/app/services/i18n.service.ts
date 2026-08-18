import { computed, Injectable, signal } from '@angular/core';

import en from '../../assets/i18n/en.json';
import fr from '../../assets/i18n/fr.json';

type TranslationData = Record<string, unknown>;
type TranslationMap = Record<string, TranslationData>;

const TRANSLATIONS: TranslationMap = { en, fr };
const SUPPORTED = ['en', 'fr'];

function getSystemLang(): string {
  try {
    const nav = navigator?.language ?? 'en';
    return nav.split('-')[0].toLowerCase();
  } catch {
    return 'en';
  }
}

function resolveSystemLang(): string {
  const sys = getSystemLang();
  return SUPPORTED.includes(sys) ? sys : 'en';
}

function resolve(data: TranslationData, path: string): string {
  const parts = path.split('.');
  let cur: unknown = data;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === 'string' ? cur : path;
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal(resolveSystemLang());

  readonly current = computed(() => TRANSLATIONS[this.lang()] ?? TRANSLATIONS['en']);

  t(key: string): string {
    return resolve(this.current(), key);
  }

  setLang(lang: string): void {
    if (SUPPORTED.includes(lang)) {
      this.lang.set(lang);
    }
  }
}
