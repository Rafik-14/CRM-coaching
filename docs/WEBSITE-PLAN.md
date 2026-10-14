# Site public de Jérémy Galéa — plan de développement

> **Décision :** l'ancien site est abandonné ; un nouveau site est développé **dans le même projet que le CRM**
> (même Next.js, même base, même serveur). Branche : `feat/website`.
> **Sources du contenu :** dossier client `OneDrive_2026-10-12/Jeremy Galea/Website Project/01 - Request Client/`
> (`01 - VISUAL BRIEF MAÎTRE — DESIGN SYSTEM WEB JG®.pdf`, `Site web JGinstructions.pdf`, `Pictures/`).
> **Objectifs :** (1) faire réserver un échange stratégique, (2) montrer le travail (méthode, offres, transformations),
> (3) présenter Jérémy (à propos, livre).
> **Dernière mise à jour :** 2026-10-14
> **État :** étapes 1 à 8 réalisées sur `feat/website` (vérifiées sur ordinateur, tablette et téléphone). Démo Vercel : pas encore déployée.

---

## 1. Architecture

| Partie | Adresse | Accès |
|---|---|---|
| Site public | `/` et pages publiques | tout le monde |
| Réservation | `/reserver` | tout le monde |
| CRM | `/tableau-de-bord`, `/contacts`, … (plus tard `crm.domaine`) | Jérémy (connexion) |
| Espace client (Phase 3) | `/mon-espace` | chaque client |

- Les pages publiques vivent dans `src/app/(site)/` avec leur propre layout (en-tête, pied de page). Le CRM reste dans `src/app/(coach)/`.
- `src/proxy.ts` passe d'une liste « publique » à une liste **protégée** : seules les routes du CRM exigent une session.
- Les données vivantes viennent du CRM : prix des accompagnements, études de cas acceptées, disponibilités.
- Design : charte JG® déjà en place (couleurs, Montserrat / Lato, boutons 7 px). Le site suit les mesures du brief
  (conteneur 1240 px, sections 96–120 px, boutons 48–54 px, alternance blanc / ivoire / bleu nuit).

## 2. Pages (contenu du brief)

| Route | Page | Fonction (brief) |
|---|---|---|
| `/` | Accueil | Faire découvrir et donner envie (10 sections) |
| `/methode` | La Méthode JG® | Faire comprendre |
| `/accompagnements` | Accompagnements | Faire choisir (prix lus dans le CRM) |
| `/accompagnements/parcours-signature` | Parcours Signature JG® | Page dédiée |
| `/pour-qui` | Pour qui ? | Faire s'identifier (5 publics) |
| `/transformations` | Transformations | Prouver et rassurer (cas du site + cas du CRM acceptés) |
| `/a-propos` | À propos | Rencontrer Jérémy |
| `/le-chant-du-merle` | Le Chant du Merle | Découvrir l'auteur |
| `/contact` | Contact | Passer à l'action (formulaire → CRM) |
| `/reserver` | Réserver un échange stratégique | Réservation en ligne → CRM |
| `/faq`, `/cgv`, `/mentions-legales`, `/confidentialite`, `/cookies` | Pied de page | Textes légaux (à compléter par le client) |

## 3. Réservation en ligne (cœur du site)

1. Le visiteur choisit un jour, puis un créneau de 20 min parmi les disponibilités de Jérémy.
2. Il indique prénom, nom, e-mail, téléphone (facultatif), sa situation et son enjeu ; il accepte la politique de confidentialité.
3. Le CRM crée ou retrouve le contact (par e-mail), crée la séance « Échange stratégique », le fait passer à
   « Échange stratégique planifié », ajoute une tâche et une entrée d'historique.
4. Page de confirmation + fichier calendrier (.ics). Les e-mails de confirmation et de rappel arrivent avec la Phase 2.
- **Disponibilités** (Paramètres du CRM) : jours et plages horaires, durée, temps de pause, délai minimum, horizon de réservation.
- **Sécurité** : créneau revérifié côté serveur (pas de double réservation), limitation des envois, champ anti-robot.
- Chaque bouton du site transmet sa provenance (`?source=…`, `?profil=…`) pour remplir le type de client.

## 4. Étapes

| # | Étape | Résultat |
|---|---|---|
| 1 | Routes publiques, proxy, layout du site, photos optimisées | Navigation complète, en-tête / pied de page |
| 2 | Accueil + Méthode | Les deux pages principales |
| 3 | Accompagnements (+ Parcours Signature), Pour qui ? | Offres et prix depuis le CRM |
| 4 | Transformations, À propos, Le Chant du Merle | Preuves et personne |
| 5 | Contact (formulaire → CRM) | Message = contact + tâche |
| 6 | Réservation : disponibilités, créneaux, page publique | Réservation → CRM |
| 7 | FAQ et pages légales, SEO (titres, description, sitemap, robots), accessibilité | Prêt à publier |
| 8 | Vérification desktop / mobile, déploiement de démonstration | Lien à partager |

## 5. Réalisé — écarts et points d'attention

- **Textes** repris tels quels du document client. Seuls ajouts : petits libellés au-dessus des titres, « Le moment révélateur »
  (anecdote de Yannick), « 20 minutes · Sans engagement » sous les boutons.
- **Accueil, section 6** : trois cartes avec les pictogrammes Clarifier / Révéler / Incarner ; le schéma « Ma méthode »
  est placé sur la page Méthode (nom du fichier client). Il indique **CLARIFIER** alors que la page Méthode dit **RELIER** :
  à faire trancher par Jérémy (Q1 du plan JG).
- **Pour qui ?** : le client demandait « le même visuel que la page d'accueil » (de l'ancien site, non fourni). Photos utilisées :
  intervention (Entreprises) et atelier (Écoles) ; Particuliers et Entrepreneurs sans photo.
- **Transformations** : pas de photo de Yannick ni de Jean-Gabriel → initiale dans un cercle. Les cas du CRM (client terminé +
  accord témoignage) s'ajoutent sous « D'autres parcours » (prénom et enjeu seulement, 4 maximum).
- **Prix** lus dans le CRM. La description du Parcours Signature dans la base locale est l'ancienne version courte :
  la valeur par défaut a été corrigée (jg-defaults), la base existante se modifie dans Paramètres → Accompagnements.
- **Pages légales** : structure prête, passages manquants signalés « à compléter ».
- **Réservation** : pas d'e-mail de confirmation (Phase 2) ; Jérémy reçoit la séance, la tâche et le contact dans le CRM.
  Disponibilités par défaut : lundi–vendredi 9 h–12 h et 14 h–18 h, créneaux de 20 min, pause 10 min, délai 24 h, 30 jours.

## 6. À confirmer avec le client

- Nom de domaine (.com ou .ch) et accès OVH.
- Disponibilités réelles pour l'échange stratégique.
- Photos définitives et droits d'utilisation ; vidéo du livre (lien YouTube) et lien Amazon exacts.
- Textes légaux (CGV, mentions légales, confidentialité) : contenus fournis par le client ou son conseil.
- Paiement en ligne des accompagnements (Phase 2) : oui / non.
