/**
 * Feature switch for the Révélateur: everything stays hidden (404) until REVELATEUR_ENABLED=true.
 * On today's setup it is set on staging and locally only — never on the live site before launch.
 */
export const revelateurEnabled = () => process.env.REVELATEUR_ENABLED === "true";
