/* Add keys introduced by the UI translation work to all locale files. */
import fs from "node:fs";

const LANGS = ["en", "es", "fr", "pt"];

/** True when a value is a per-language leaf: { en, es, fr, pt }. */
const isPerLanguage = (v) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).every((k) => LANGS.includes(k));

const ADDITIONS = {
  common: {
    openNavigationMenu: {
      en: "Open navigation menu",
      es: "Abrir menú de navegación",
      fr: "Ouvrir le menu de navigation",
      pt: "Abrir menu de navegação",
    },
    timezone: {
      en: "Timezone",
      es: "Zona horaria",
      fr: "Fuseau horaire",
      pt: "Fuso horário",
    },
    currency: { en: "Currency", es: "Moneda", fr: "Devise", pt: "Moeda" },
    dateRange: {
      en: "Date range",
      es: "Rango de fechas",
      fr: "Plage de dates",
      pt: "Intervalo de datas",
    },
    fromDate: {
      en: "From date",
      es: "Fecha inicial",
      fr: "Date de début",
      pt: "Data inicial",
    },
    toDate: {
      en: "To date",
      es: "Fecha final",
      fr: "Date de fin",
      pt: "Data final",
    },
    toSeparator: { en: "to", es: "a", fr: "à", pt: "até" },
    last7Days: {
      en: "Last 7 days",
      es: "Últimos 7 días",
      fr: "7 derniers jours",
      pt: "Últimos 7 dias",
    },
  },
  tenant: {
    roleAdmin: { en: "Admin", es: "Admin", fr: "Admin", pt: "Admin" },
    roleHr: { en: "HR", es: "RR. HH.", fr: "RH", pt: "RH" },
    roleMember: { en: "Member", es: "Miembro", fr: "Membre", pt: "Membro" },
  },
  settings: {
    notifications: {
      title: {
        en: "Notifications",
        es: "Notificaciones",
        fr: "Notifications",
        pt: "Notificações",
      },
    },
  },
};

for (const lang of LANGS) {
  const file = `src/lib/i18n/${lang}.json`;
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));

  const apply = (target, keys) => {
    for (const [key, value] of Object.entries(keys)) {
      if (isPerLanguage(value)) {
        target[key] = value[lang];
      } else {
        if (!target[key] || typeof target[key] !== "object") target[key] = {};
        apply(target[key], value);
      }
    }
  };

  apply(dict, ADDITIONS);
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n");
  console.log(`updated ${lang}`);
}
