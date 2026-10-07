// Limites identiques à celles du schéma de validation du back
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 50;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 80;

export const required = (val: string) => !!val.trim() || 'Ce champ est obligatoire';

export const minLength = (min: number) => (val: string) =>
  val.length >= min || `${min} caractères minimum`;

export const maxLength = (max: number) => (val: string) =>
  val.length <= max || `${max} caractères maximum`;

export const safeCharacters = (val: string) =>
  /^[a-z0-9_.-]+$/.test(val) || 'Minuscules, chiffres, point, tiret et underscore uniquement';
