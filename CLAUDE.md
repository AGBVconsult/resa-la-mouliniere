# CLAUDE.md

## Workflow Git

- Une fois les changements commités et poussés sur la branche de travail, **créer automatiquement une Pull Request** vers la branche par défaut, sans demander confirmation.
- Une fois la PR créée, **la merger immédiatement**, sans demander confirmation et sans attendre la fin du déploiement de prévisualisation Vercel (ce n'est pas une CI bloquante). Valider avant le push avec les vérifications locales (typecheck, lint et tests des fichiers touchés).
