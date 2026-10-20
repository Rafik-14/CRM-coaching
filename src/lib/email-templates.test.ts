import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATE_DEFS, TEMPLATE_KEYS, fillTemplate, fillTemplateText, resolveTemplate, templateFormSchema, unknownVariables } from "./email-templates";

describe("email templates", () => {
  it("every default text only uses the variables its e-mail provides", () => {
    for (const key of TEMPLATE_KEYS) {
      const def = TEMPLATE_DEFS[key];
      for (const text of [def.subject, def.heading, def.body]) {
        assert.deepEqual(unknownVariables(text, def.variables), [], `${key}: ${text}`);
      }
      assert.equal(templateFormSchema(key).safeParse(def).success, true, key);
    }
  });

  it("fills variables, tolerating spaces inside the braces", () => {
    assert.equal(fillTemplate("Bonjour {{prenom}}, à {{ heure }}.", { prenom: "Claire", heure: "10:00" }), "Bonjour Claire, à 10:00.");
  });

  it("a missing value becomes empty text, never « {{…}} » in the e-mail", () => {
    assert.equal(fillTemplate("Lien : {{lien_reservation}}", {}), "Lien : ");
  });

  it("splits the text into paragraphs on blank lines", () => {
    const filled = fillTemplateText({ subject: "Objet  {{prenom}}", heading: "Titre", body: "Un\n\n\nDeux\nsuite" }, { prenom: "Marc" });
    assert.equal(filled.subject, "Objet Marc");
    assert.deepEqual(filled.paragraphs, ["Un", "Deux\nsuite"]);
  });

  it("rejects a variable the e-mail does not know, and an empty field", () => {
    const schema = templateFormSchema("coaching_finished");
    const r = schema.safeParse({ subject: "Merci", heading: "Merci {{prenom}}", body: "Votre séance du {{date}}" });
    assert.equal(r.success, false);
    assert.match(r.error!.issues[0].message, /\{\{date\}\}/);
    assert.equal(schema.safeParse({ subject: "", heading: "x", body: "y" }).success, false);
  });

  it("uses the coach's wording when saved, the default otherwise", () => {
    assert.equal(resolveTemplate("welcome_client", null).subject, TEMPLATE_DEFS.welcome_client.subject);
    assert.equal(resolveTemplate("welcome_client", { subject: "Bienvenue !", heading: "", body: "" }).subject, "Bienvenue !");
  });
});
